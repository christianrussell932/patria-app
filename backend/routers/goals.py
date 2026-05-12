"""Family Goals router."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

from deps import db, get_household, now_utc, make_id, Household

router = APIRouter(prefix="/goals", tags=["goals"])


class GoalCreate(BaseModel):
    title: str
    description: Optional[str] = None
    scope: str = "short"  # short | long
    progress: int = 0  # 0-100
    deadline: Optional[str] = None


class GoalUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    scope: Optional[str] = None
    progress: Optional[int] = None
    deadline: Optional[str] = None
    completed: Optional[bool] = None


@router.get("")
async def list_goals(h: Household = Depends(get_household)):
    goals = await db.family_goals.find(
        {"household_id": h.household_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(200)
    return {"goals": goals}


@router.post("")
async def create_goal(payload: GoalCreate, h: Household = Depends(get_household)):
    data = payload.model_dump()
    data["progress"] = max(0, min(100, data.get("progress", 0)))
    if data.get("scope") not in ("short", "long"):
        raise HTTPException(status_code=400, detail="scope must be short or long")
    gid = make_id("goal")
    await db.family_goals.insert_one({
        "goal_id": gid, "household_id": h.household_id,
        **data, "completed": False, "created_at": now_utc().isoformat(),
    })
    return {"goal_id": gid}


@router.patch("/{goal_id}")
async def update_goal(goal_id: str, payload: GoalUpdate, h: Household = Depends(get_household)):
    update = payload.model_dump(exclude_none=True)
    if "progress" in update:
        update["progress"] = max(0, min(100, update["progress"]))
    if update:
        await db.family_goals.update_one(
            {"goal_id": goal_id, "household_id": h.household_id}, {"$set": update}
        )
    return {"ok": True}


@router.delete("/{goal_id}")
async def delete_goal(goal_id: str, h: Household = Depends(get_household)):
    await db.family_goals.delete_one({"goal_id": goal_id, "household_id": h.household_id})
    return {"ok": True}
