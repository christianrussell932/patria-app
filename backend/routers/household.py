"""Household + Members router."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from deps import db, get_current_user, get_household, now_utc, make_id, User, Household

router = APIRouter(tags=["household"])


class HouseholdCreate(BaseModel):
    name: str
    patron_saint: Optional[str] = None
    calendar_variant: str = "roman"
    parent_name: Optional[str] = None
    parent_color: str = "violet"


class HouseholdUpdate(BaseModel):
    name: Optional[str] = None
    patron_saint: Optional[str] = None
    calendar_variant: Optional[str] = None
    mission_statement: Optional[str] = None
    values: Optional[List[str]] = None
    technology_policy: Optional[str] = None
    roles: Optional[dict] = None
    sacred_heart_enthroned_at: Optional[str] = None
    sacred_heart_renewal_at: Optional[str] = None
    sacred_heart_notes: Optional[str] = None
    # v0.15 — First Rule of the Home onboarding additions
    drift_areas: Optional[List[str]] = None
    peace_to_protect: Optional[str] = None
    first_household_rule: Optional[str] = None
    first_council_at: Optional[str] = None  # ISO datetime
    first_charter_completed_at: Optional[str] = None  # set once when charter finalized


class FirstCharter(BaseModel):
    """Atomic payload submitted at the end of the new onboarding charter flow."""
    drift_areas: List[str] = []
    peace_to_protect: Optional[str] = None
    first_household_rule: Optional[str] = None
    first_council_at: Optional[str] = None  # ISO datetime "YYYY-MM-DDTHH:MM"


class MemberCreate(BaseModel):
    name: str
    role: str
    color: str = "slate"
    patron_saint: Optional[str] = None


@router.post("/household")
async def create_household(payload: HouseholdCreate, user: User = Depends(get_current_user)):
    hid = make_id("hh")
    await db.households.insert_one({
        "household_id": hid, "name": payload.name, "patron_saint": payload.patron_saint,
        "calendar_variant": payload.calendar_variant, "created_by": user.user_id,
        "created_at": now_utc().isoformat(),
    })
    member_id = make_id("mem")
    await db.members.insert_one({
        "member_id": member_id, "household_id": hid,
        "name": payload.parent_name or user.name, "role": "parent",
        "color": payload.parent_color, "patron_saint": None,
        "linked_user_id": user.user_id, "created_at": now_utc().isoformat(),
    })
    await db.users.update_one({"user_id": user.user_id}, {"$set": {"current_household_id": hid}})
    return {"household_id": hid}


@router.get("/household/me")
async def get_my_household(user: User = Depends(get_current_user)):
    if not user.current_household_id:
        return {"household": None, "members": []}
    h = await db.households.find_one({"household_id": user.current_household_id}, {"_id": 0})
    if not h:
        return {"household": None, "members": []}
    members = await db.members.find({"household_id": user.current_household_id}, {"_id": 0}).to_list(200)
    return {"household": h, "members": members}


@router.patch("/household")
async def update_household(payload: HouseholdUpdate, h: Household = Depends(get_household)):
    update = {k: v for k, v in payload.model_dump(exclude_none=True).items()}
    if update:
        await db.households.update_one({"household_id": h.household_id}, {"$set": update})
    return {"ok": True}


@router.post("/household/first-charter")
async def save_first_charter(payload: FirstCharter, h: Household = Depends(get_household)):
    """v0.15 — Persists the user's 'First Rule of the Home' charter answers and,
    if a date/time was selected, creates a `council`-type schedule event so the
    first Family Council appears in Today / Upcoming on the Dashboard.

    Idempotent in spirit: writing twice updates the household fields and creates
    an additional event row (caller responsible for not re-submitting)."""
    update = {
        "drift_areas": payload.drift_areas,
        "peace_to_protect": payload.peace_to_protect,
        "first_household_rule": payload.first_household_rule,
        "first_council_at": payload.first_council_at,
        "first_charter_completed_at": now_utc().isoformat(),
    }
    await db.households.update_one(
        {"household_id": h.household_id},
        {"$set": {k: v for k, v in update.items() if v is not None}},
    )

    event_id = None
    if payload.first_council_at:
        # Accept "YYYY-MM-DDTHH:MM" or "YYYY-MM-DD HH:MM"
        raw = payload.first_council_at.replace(" ", "T")
        if "T" in raw:
            event_date, event_time = raw.split("T", 1)
            event_time = event_time[:5]
        else:
            event_date, event_time = raw, None
        event_id = make_id("evt")
        await db.events.insert_one({
            "event_id": event_id, "household_id": h.household_id,
            "title": "Family Council", "event_date": event_date, "event_time": event_time,
            "type": "council", "notes": "First Family Council — established at onboarding.",
            "member_ids": [], "created_at": now_utc().isoformat(),
        })

    return {"ok": True, "event_id": event_id}


@router.post("/household/members")
async def add_member(payload: MemberCreate, h: Household = Depends(get_household)):
    if payload.role not in ("parent", "child"):
        raise HTTPException(status_code=400, detail="role must be parent or child")
    member_id = make_id("mem")
    await db.members.insert_one({
        "member_id": member_id, "household_id": h.household_id, "name": payload.name,
        "role": payload.role, "color": payload.color, "patron_saint": payload.patron_saint,
        "linked_user_id": None, "created_at": now_utc().isoformat(),
    })
    return {"member_id": member_id}


@router.delete("/household/members/{member_id}")
async def delete_member(member_id: str, user: User = Depends(get_current_user)):
    from deps import require_household
    h = await require_household(user)
    m = await db.members.find_one({"member_id": member_id, "household_id": h.household_id}, {"_id": 0})
    if not m:
        raise HTTPException(status_code=404, detail="Member not found")
    if m.get("linked_user_id") == user.user_id:
        raise HTTPException(status_code=400, detail="Cannot remove your own primary profile")
    await db.members.delete_one({"member_id": member_id})
    await db.rules.update_many(
        {"household_id": h.household_id}, {"$pull": {"assigned_member_ids": member_id}}
    )
    return {"ok": True}
