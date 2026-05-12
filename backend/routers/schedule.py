"""Schedule router — family events."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from deps import db, get_household, now_utc, make_id, Household

router = APIRouter(prefix="/schedule", tags=["schedule"])


class EventCreate(BaseModel):
    title: str
    event_date: str  # YYYY-MM-DD
    event_time: Optional[str] = None  # HH:MM
    type: str = "family"
    notes: Optional[str] = None
    member_ids: List[str] = []


class EventUpdate(BaseModel):
    title: Optional[str] = None
    event_date: Optional[str] = None
    event_time: Optional[str] = None
    type: Optional[str] = None
    notes: Optional[str] = None
    member_ids: Optional[List[str]] = None


@router.get("/events")
async def list_events(start: Optional[str] = None, end: Optional[str] = None, h: Household = Depends(get_household)):
    q = {"household_id": h.household_id}
    if start or end:
        q["event_date"] = {}
        if start:
            q["event_date"]["$gte"] = start
        if end:
            q["event_date"]["$lte"] = end
    events = await db.events.find(q, {"_id": 0}).sort("event_date", 1).to_list(500)
    return {"events": events}


@router.post("/events")
async def create_event(payload: EventCreate, h: Household = Depends(get_household)):
    if payload.type not in ("family", "liturgical", "date_night", "school", "medical", "other"):
        raise HTTPException(status_code=400, detail="invalid event type")
    eid = make_id("evt")
    await db.events.insert_one({
        "event_id": eid, "household_id": h.household_id,
        **payload.model_dump(), "created_at": now_utc().isoformat(),
    })
    return {"event_id": eid}


@router.patch("/events/{event_id}")
async def update_event(event_id: str, payload: EventUpdate, h: Household = Depends(get_household)):
    update = payload.model_dump(exclude_none=True)
    if update:
        await db.events.update_one(
            {"event_id": event_id, "household_id": h.household_id}, {"$set": update}
        )
    return {"ok": True}


@router.delete("/events/{event_id}")
async def delete_event(event_id: str, h: Household = Depends(get_household)):
    await db.events.delete_one({"event_id": event_id, "household_id": h.household_id})
    return {"ok": True}
