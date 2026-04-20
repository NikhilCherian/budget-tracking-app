from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from supabase import Client
from datetime import date

from auth import get_current_user, get_db

router = APIRouter()


class GoalIn(BaseModel):
    name: str
    target_amount: float
    current_amount: float = 0
    deadline: date | None = None
    icon: str = "🎯"
    color: str = "#10b981"


@router.get("")
def list_goals(db: Client = Depends(get_db)):
    return db.table("goals").select("*").order("created_at").execute().data


@router.post("", status_code=201)
def create_goal(
    body: GoalIn,
    db: Client = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    profile = db.table("profiles").select("household_id").eq("id", user["user_id"]).single().execute()
    household_id = profile.data.get("household_id")
    if not household_id:
        raise HTTPException(status_code=400, detail="Join a household first")

    row = {
        "household_id": household_id,
        **body.model_dump(exclude_none=True),
        "deadline": body.deadline.isoformat() if body.deadline else None,
    }
    result = db.table("goals").insert(row).execute()
    return result.data[0]


@router.put("/{goal_id}")
def update_goal(goal_id: str, body: GoalIn, db: Client = Depends(get_db)):
    result = db.table("goals").update({
        **body.model_dump(exclude_none=True),
        "deadline": body.deadline.isoformat() if body.deadline else None,
    }).eq("id", goal_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Goal not found")
    return result.data[0]


@router.delete("/{goal_id}", status_code=204)
def delete_goal(goal_id: str, db: Client = Depends(get_db)):
    db.table("goals").delete().eq("id", goal_id).execute()
