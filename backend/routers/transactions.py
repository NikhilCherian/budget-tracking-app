from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel
from supabase import Client
from datetime import date

from auth import get_current_user, get_db
from pdf_parser import parse_pdf

router = APIRouter()


class TransactionIn(BaseModel):
    category_id: str | None = None
    amount: float
    description: str
    date: date
    notes: str | None = None


@router.get("")
def list_transactions(
    month: str | None = None,  # YYYY-MM
    db: Client = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    q = db.table("transactions").select(
        "*, categories(name, icon, color), profiles(display_name, avatar_color)"
    ).order("date", desc=True)

    if month:
        try:
            year, mon = month.split("-")
            start = f"{year}-{mon}-01"
            # last day via next month trick
            next_mon = int(mon) % 12 + 1
            next_year = int(year) + (1 if next_mon == 1 else 0)
            end = f"{next_year}-{next_mon:02d}-01"
        except ValueError:
            raise HTTPException(status_code=400, detail="month must be YYYY-MM")
        q = q.gte("date", start).lt("date", end)

    result = q.execute()
    return result.data


@router.post("", status_code=201)
def create_transaction(
    body: TransactionIn,
    db: Client = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    profile = db.table("profiles").select("household_id").eq("id", user["user_id"]).single().execute()
    household_id = profile.data.get("household_id")
    if not household_id:
        raise HTTPException(status_code=400, detail="Join a household first")

    row = {
        "household_id": household_id,
        "user_id": user["user_id"],
        "category_id": body.category_id,
        "amount": body.amount,
        "description": body.description,
        "date": body.date.isoformat(),
        "notes": body.notes,
        "source": "manual",
    }
    result = db.table("transactions").insert(row).execute()
    return result.data[0]


@router.put("/{tx_id}")
def update_transaction(
    tx_id: str,
    body: TransactionIn,
    db: Client = Depends(get_db),
):
    result = db.table("transactions").update({
        "category_id": body.category_id,
        "amount": body.amount,
        "description": body.description,
        "date": body.date.isoformat(),
        "notes": body.notes,
    }).eq("id", tx_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return result.data[0]


@router.delete("/{tx_id}", status_code=204)
def delete_transaction(tx_id: str, db: Client = Depends(get_db)):
    db.table("transactions").delete().eq("id", tx_id).execute()


@router.post("/pdf-import")
async def import_pdf(
    file: UploadFile = File(...),
    db: Client = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:  # 10 MB cap
        raise HTTPException(status_code=400, detail="File too large (max 10 MB)")

    parsed = parse_pdf(content)
    if not parsed:
        raise HTTPException(
            status_code=422,
            detail="No transactions found. The PDF may be scanned (image-based) or in an unsupported format.",
        )

    profile = db.table("profiles").select("household_id").eq("id", user["user_id"]).single().execute()
    household_id = profile.data.get("household_id")
    if not household_id:
        raise HTTPException(status_code=400, detail="Join a household first")

    rows = [
        {
            "household_id": household_id,
            "user_id": user["user_id"],
            "amount": tx["amount"],
            "description": tx["description"],
            "date": tx["date"],
            "source": "pdf_import",
        }
        for tx in parsed
    ]
    result = db.table("transactions").insert(rows).execute()
    return {"imported": len(result.data), "transactions": result.data}
