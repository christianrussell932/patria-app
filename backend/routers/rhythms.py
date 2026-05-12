"""Household Rhythms router — recurring commitments (Confession, Adoration, etc.)."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import date

from dateutil.relativedelta import relativedelta

from deps import db, get_household, now_utc, make_id, Household

router = APIRouter(prefix="/rhythms", tags=["rhythms"])

CADENCES = ("daily", "weekly", "monthly", "quarterly", "yearly")


class RhythmCreate(BaseModel):
    name: str
    cadence: str = "weekly"
    last_observed: Optional[str] = None
    member_ids: List[str] = []
    notes: Optional[str] = None


class RhythmUpdate(BaseModel):
    name: Optional[str] = None
    cadence: Optional[str] = None
    last_observed: Optional[str] = None
    member_ids: Optional[List[str]] = None
    notes: Optional[str] = None


def _next_due(cadence: str, last_observed: Optional[str]) -> Optional[str]:
    """Cadence-aware next-due using dateutil.relativedelta.

    - daily: +1 day
    - weekly: +1 week
    - monthly: +1 month (clamps to last day for short months)
    - quarterly: +3 months
    - yearly: +1 year (handles Feb 29 by clamping)
    """
    if not last_observed:
        return None
    try:
        last = date.fromisoformat(last_observed)
    except Exception:
        return None
    deltas = {
        "daily": relativedelta(days=1),
        "weekly": relativedelta(weeks=1),
        "monthly": relativedelta(months=1),
        "quarterly": relativedelta(months=3),
        "yearly": relativedelta(years=1),
    }
    delta = deltas.get(cadence, relativedelta(weeks=1))
    return (last + delta).isoformat()


@router.get("")
async def list_rhythms(h: Household = Depends(get_household)):
    rhythms = await db.rhythms.find(
        {"household_id": h.household_id}, {"_id": 0}
    ).to_list(200)
    for r in rhythms:
        r["next_due"] = _next_due(r.get("cadence", "weekly"), r.get("last_observed"))
    return {"rhythms": rhythms}


@router.post("")
async def create_rhythm(payload: RhythmCreate, h: Household = Depends(get_household)):
    if payload.cadence not in CADENCES:
        raise HTTPException(status_code=400, detail="invalid cadence")
    rid = make_id("rhy")
    await db.rhythms.insert_one({
        "rhythm_id": rid, "household_id": h.household_id,
        **payload.model_dump(), "created_at": now_utc().isoformat(),
    })
    return {"rhythm_id": rid}


@router.patch("/{rhythm_id}")
async def update_rhythm(rhythm_id: str, payload: RhythmUpdate, h: Household = Depends(get_household)):
    update = payload.model_dump(exclude_none=True)
    if "cadence" in update and update["cadence"] not in CADENCES:
        raise HTTPException(status_code=400, detail="invalid cadence")
    if update:
        await db.rhythms.update_one(
            {"rhythm_id": rhythm_id, "household_id": h.household_id}, {"$set": update}
        )
    return {"ok": True}


@router.delete("/{rhythm_id}")
async def delete_rhythm(rhythm_id: str, h: Household = Depends(get_household)):
    await db.rhythms.delete_one({"rhythm_id": rhythm_id, "household_id": h.household_id})
    return {"ok": True}


@router.post("/{rhythm_id}/observe")
async def observe_rhythm(rhythm_id: str, h: Household = Depends(get_household)):
    await db.rhythms.update_one(
        {"rhythm_id": rhythm_id, "household_id": h.household_id},
        {"$set": {"last_observed": date.today().isoformat()}},
    )
    return {"ok": True}
