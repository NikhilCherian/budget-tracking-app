from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from supabase import Client

from auth import get_current_user, get_db

router = APIRouter()


class CategoryIn(BaseModel):
    name: str
    icon: str = "💰"
    color: str = "#6366f1"
    monthly_limit: float | None = None


@router.get("")
def list_categories(db: Client = Depends(get_db)):
    return db.table("categories").select("*").order("name").execute().data


@router.post("", status_code=201)
def create_category(
    body: CategoryIn,
    db: Client = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    profile = db.table("profiles").select("household_id").eq("id", user["user_id"]).single().execute()
    household_id = profile.data.get("household_id")
    if not household_id:
        raise HTTPException(status_code=400, detail="Join a household first")

    result = db.table("categories").insert({
        "household_id": household_id,
        **body.model_dump(exclude_none=True),
        "is_default": False,
    }).execute()
    return result.data[0]


@router.put("/{cat_id}")
def update_category(cat_id: str, body: CategoryIn, db: Client = Depends(get_db)):
    result = db.table("categories").update(
        body.model_dump(exclude_none=True)
    ).eq("id", cat_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Category not found")
    return result.data[0]


@router.delete("/{cat_id}", status_code=204)
def delete_category(cat_id: str, db: Client = Depends(get_db)):
    cat = db.table("categories").select("is_default").eq("id", cat_id).maybe_single().execute()
    if cat.data and cat.data.get("is_default"):
        raise HTTPException(status_code=400, detail="Cannot delete default categories")
    db.table("categories").delete().eq("id", cat_id).execute()
