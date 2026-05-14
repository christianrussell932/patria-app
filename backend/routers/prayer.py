"""Prayer tracker router."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import date, timedelta

from deps import db, get_household, now_utc, make_id, Household

router = APIRouter(prefix="/prayer", tags=["prayer"])


class PrayerLogCreate(BaseModel):
    # member_id was required when prayer was tracked per-person.
    # As of v0.11 prayer is logged at the household level: member_id is optional and
    # accepted only for backwards compatibility with any older client. New logs omit it.
    member_id: Optional[str] = None
    prayer_type: str
    detail: Optional[str] = None
    log_date: Optional[str] = None


@router.post("/log")
async def log_prayer(payload: PrayerLogCreate, h: Household = Depends(get_household)):
    log_date = payload.log_date or date.today().isoformat()
    doc = {
        "log_id": make_id("plog"), "household_id": h.household_id,
        "member_id": payload.member_id, "prayer_type": payload.prayer_type,
        "detail": payload.detail, "log_date": log_date,
        "created_at": now_utc().isoformat(),
    }
    await db.prayer_logs.insert_one(doc)
    return {"log_id": doc["log_id"]}


@router.delete("/log/{log_id}")
async def delete_prayer_log(log_id: str, h: Household = Depends(get_household)):
    await db.prayer_logs.delete_one({"log_id": log_id, "household_id": h.household_id})
    return {"ok": True}


@router.get("/log")
async def get_prayer_log(log_date: Optional[str] = None, h: Household = Depends(get_household)):
    cdate = log_date or date.today().isoformat()
    logs = await db.prayer_logs.find(
        {"household_id": h.household_id, "log_date": cdate}, {"_id": 0}
    ).to_list(500)
    return {"date": cdate, "logs": logs}


@router.get("/stats")
async def prayer_stats(h: Household = Depends(get_household)):
    week_start = (date.today() - timedelta(days=6)).isoformat()
    pipeline = [
        {"$match": {"household_id": h.household_id, "log_date": {"$gte": week_start}}},
        {"$group": {"_id": "$prayer_type", "count": {"$sum": 1}}},
    ]
    out = {}
    async for r in db.prayer_logs.aggregate(pipeline):
        out[r["_id"]] = r["count"]
    total = sum(out.values())
    return {"week_start": week_start, "by_type": out, "total": total}
