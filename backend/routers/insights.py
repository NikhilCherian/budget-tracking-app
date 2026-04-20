from fastapi import APIRouter, Depends, HTTPException
from supabase import Client
from datetime import date, timedelta
import calendar

from auth import get_current_user, get_db

router = APIRouter()


def _first_of_month(d: date) -> date:
    return d.replace(day=1)


def _days_in_month(d: date) -> int:
    return calendar.monthrange(d.year, d.month)[1]


@router.get("/projection")
def get_projection(
    month: str | None = None,  # YYYY-MM; defaults to current month
    db: Client = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    today = date.today()

    if month:
        try:
            year, mon = month.split("-")
            target = date(int(year), int(mon), 1)
        except (ValueError, TypeError):
            raise HTTPException(status_code=400, detail="month must be YYYY-MM")
    else:
        target = _first_of_month(today)

    days_total = _days_in_month(target)
    days_elapsed = min((today - target).days + 1, days_total) if today >= target else days_total

    # Transactions for the selected month
    start = target.isoformat()
    next_month = target + timedelta(days=days_total)
    end = next_month.isoformat()

    tx_result = db.table("transactions").select("amount, date").gte("date", start).lt("date", end).execute()
    transactions = tx_result.data or []
    total_spent = sum(float(tx["amount"]) for tx in transactions)

    # Budget for the month
    budget_result = (
        db.table("budgets")
        .select("total_limit")
        .eq("month", start)
        .maybe_single()
        .execute()
    )
    budget_limit = float(budget_result.data["total_limit"]) if budget_result.data else None

    # Projection
    daily_rate = total_spent / days_elapsed if days_elapsed > 0 else 0
    projected_total = daily_rate * days_total
    remaining_budget = (budget_limit - total_spent) if budget_limit else None
    projected_remaining = (budget_limit - projected_total) if budget_limit else None

    # Safe-to-spend signal
    if budget_limit and budget_limit > 0:
        ratio = projected_total / budget_limit
        if ratio <= 0.85:
            signal = "green"
        elif ratio <= 1.0:
            signal = "amber"
        else:
            signal = "red"
    else:
        signal = "unknown"

    # Category breakdown for the month
    cat_result = db.table("transactions").select(
        "amount, categories(id, name, icon, color, monthly_limit)"
    ).gte("date", start).lt("date", end).execute()

    category_totals: dict[str, dict] = {}
    for tx in cat_result.data or []:
        cat = tx.get("categories") or {}
        cat_id = cat.get("id", "uncategorised")
        if cat_id not in category_totals:
            category_totals[cat_id] = {
                "id": cat_id,
                "name": cat.get("name", "Uncategorised"),
                "icon": cat.get("icon", "💰"),
                "color": cat.get("color", "#6b7280"),
                "monthly_limit": cat.get("monthly_limit"),
                "total": 0.0,
            }
        category_totals[cat_id]["total"] += float(tx["amount"])

    return {
        "month": target.isoformat(),
        "days_elapsed": days_elapsed,
        "days_total": days_total,
        "total_spent": round(total_spent, 2),
        "daily_rate": round(daily_rate, 2),
        "projected_total": round(projected_total, 2),
        "budget_limit": budget_limit,
        "remaining_budget": round(remaining_budget, 2) if remaining_budget is not None else None,
        "projected_remaining": round(projected_remaining, 2) if projected_remaining is not None else None,
        "signal": signal,
        "categories": list(category_totals.values()),
    }
