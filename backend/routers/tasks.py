"""Household Tasks router."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional

from deps import db, get_household, now_utc, make_id, Household

router = APIRouter(prefix="/tasks", tags=["tasks"])


class TaskCreate(BaseModel):
    title: str
    due_date: Optional[str] = None
    assigned_member_id: Optional[str] = None
    category: Optional[str] = "general"  # general | chore | errand | maintenance


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    due_date: Optional[str] = None
    assigned_member_id: Optional[str] = None
    category: Optional[str] = None
    completed: Optional[bool] = None


@router.get("")
async def list_tasks(include_completed: bool = False, h: Household = Depends(get_household)):
    q = {"household_id": h.household_id}
    if not include_completed:
        q["completed"] = False
    tasks = await db.tasks.find(q, {"_id": 0}).sort("due_date", 1).to_list(500)
    return {"tasks": tasks}


@router.post("")
async def create_task(payload: TaskCreate, h: Household = Depends(get_household)):
    tid = make_id("task")
    await db.tasks.insert_one({
        "task_id": tid, "household_id": h.household_id,
        **payload.model_dump(), "completed": False, "completed_at": None,
        "created_at": now_utc().isoformat(),
    })
    return {"task_id": tid}


@router.patch("/{task_id}")
async def update_task(task_id: str, payload: TaskUpdate, h: Household = Depends(get_household)):
    update = payload.model_dump(exclude_none=True)
    if "completed" in update:
        update["completed_at"] = now_utc().isoformat() if update["completed"] else None
    if update:
        await db.tasks.update_one(
            {"task_id": task_id, "household_id": h.household_id}, {"$set": update}
        )
    return {"ok": True}


@router.delete("/{task_id}")
async def delete_task(task_id: str, h: Household = Depends(get_household)):
    await db.tasks.delete_one({"task_id": task_id, "household_id": h.household_id})
    return {"ok": True}
