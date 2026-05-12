"""Sacred Heart enthronement router."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import date

from dateutil.relativedelta import relativedelta

from deps import db, get_household, Household

router = APIRouter(prefix="/sacred-heart", tags=["sacred-heart"])


class SacredHeartEnthrone(BaseModel):
    enthroned_at: Optional[str] = None  # ISO date
    notes: Optional[str] = None


def _next_anniversary(base_iso: str, today: date) -> Optional[str]:
    """Compute the next anniversary (>= today) of the given base date.

    Uses dateutil.relativedelta so Feb 29 anniversaries roll cleanly to Feb 28/29
    depending on the target year (relativedelta clamps to last day of month).
    """
    try:
        base = date.fromisoformat(base_iso)
    except Exception:
        return None
    # Start at this year's anniversary, advance by 1y if already passed.
    candidate = base + relativedelta(years=(today.year - base.year))
    if candidate < today:
        candidate = candidate + relativedelta(years=1)
    return candidate.isoformat()


@router.get("/state")
async def sacred_heart_state(h: Household = Depends(get_household)):
    house = await db.households.find_one({"household_id": h.household_id}, {"_id": 0})
    eat = (house or {}).get("sacred_heart_enthroned_at")
    rat = (house or {}).get("sacred_heart_renewal_at")
    notes = (house or {}).get("sacred_heart_notes")
    next_renewal = None
    if eat:
        next_renewal = _next_anniversary(rat or eat, date.today())
    return {
        "enthroned_at": eat,
        "renewal_at": rat,
        "notes": notes,
        "next_renewal": next_renewal,
        "is_enthroned": bool(eat),
    }


@router.post("/enthrone")
async def enthrone(payload: SacredHeartEnthrone, h: Household = Depends(get_household)):
    today_str = date.today().isoformat()
    await db.households.update_one(
        {"household_id": h.household_id},
        {"$set": {
            "sacred_heart_enthroned_at": payload.enthroned_at or today_str,
            "sacred_heart_notes": payload.notes,
        }},
    )
    return {"ok": True}


@router.post("/renew")
async def renew(h: Household = Depends(get_household)):
    today_str = date.today().isoformat()
    await db.households.update_one(
        {"household_id": h.household_id},
        {"$set": {"sacred_heart_renewal_at": today_str}},
    )
    return {"ok": True}
