from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from supabase import Client
import secrets

from auth import get_current_user, get_db, get_admin_db

router = APIRouter()


class HouseholdCreate(BaseModel):
    name: str
    currency: str = "GBP"
    monthly_budget: float | None = None


class BudgetSet(BaseModel):
    month: str  # YYYY-MM-DD (first of month)
    total_limit: float


@router.post("", status_code=201)
def create_household(
    body: HouseholdCreate,
    db: Client = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    # Create household
    hh = db.table("households").insert({
        "name": body.name,
        "currency": body.currency,
        "monthly_budget": body.monthly_budget,
    }).execute()
    household_id = hh.data[0]["id"]

    # Link user's profile to the new household
    db.table("profiles").update({"household_id": household_id}).eq("id", user["user_id"]).execute()

    # Seed default categories using admin client (calls security definer function)
    admin_db = get_admin_db()
    admin_db.rpc("seed_default_categories", {"p_household_id": household_id}).execute()

    return hh.data[0]


@router.get("/me")
def get_my_household(
    db: Client = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    profile = db.table("profiles").select("household_id").eq("id", user["user_id"]).single().execute()
    household_id = profile.data.get("household_id")
    if not household_id:
        return None

    hh = db.table("households").select("*").eq("id", household_id).single().execute()
    members = db.table("profiles").select("id, display_name, email, avatar_color").eq("household_id", household_id).execute()

    return {**hh.data, "members": members.data}


@router.post("/invite")
def invite_partner(
    email: str,
    db: Client = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    profile = db.table("profiles").select("household_id").eq("id", user["user_id"]).single().execute()
    household_id = profile.data.get("household_id")
    if not household_id:
        raise HTTPException(status_code=400, detail="Create a household first")

    token = secrets.token_hex(24)
    invite = db.table("household_invites").insert({
        "household_id": household_id,
        "invited_by": user["user_id"],
        "invited_email": email,
        "token": token,
    }).execute()

    return {
        "message": f"Invite created for {email}",
        "token": token,  # frontend builds the invite URL from this
    }


@router.post("/join/{token}")
def join_household(
    token: str,
    db: Client = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    admin_db = get_admin_db()
    invite = (
        admin_db.table("household_invites")
        .select("*")
        .eq("token", token)
        .is_("accepted_at", "null")
        .maybe_single()
        .execute()
    )
    if not invite.data:
        raise HTTPException(status_code=404, detail="Invite not found or already used")

    household_id = invite.data["household_id"]

    # Link profile to household
    db.table("profiles").update({"household_id": household_id}).eq("id", user["user_id"]).execute()

    # Mark invite accepted
    admin_db.table("household_invites").update(
        {"accepted_at": "now()"}
    ).eq("token", token).execute()

    hh = db.table("households").select("*").eq("id", household_id).single().execute()
    return hh.data


@router.put("/budget")
def set_budget(
    body: BudgetSet,
    db: Client = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    profile = db.table("profiles").select("household_id").eq("id", user["user_id"]).single().execute()
    household_id = profile.data.get("household_id")
    if not household_id:
        raise HTTPException(status_code=400, detail="Join a household first")

    result = db.table("budgets").upsert({
        "household_id": household_id,
        "month": body.month,
        "total_limit": body.total_limit,
    }, on_conflict="household_id,month").execute()
    return result.data[0]
