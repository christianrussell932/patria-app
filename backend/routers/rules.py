"""Rule of Life router."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import date

from deps import db, get_household, now_utc, make_id, Household

router = APIRouter(prefix="/rules", tags=["rules"])

PILLARS = [
    "spiritual", "financial", "order", "marriage", "children", "health", "hospitality",
    "prayer", "fasting", "almsgiving", "work", "rest", "formation",
]


class RuleCreate(BaseModel):
    pillar: str
    title: str
    cadence: str = "daily"
    assigned_member_ids: List[str] = []


class RuleUpdate(BaseModel):
    title: Optional[str] = None
    cadence: Optional[str] = None
    assigned_member_ids: Optional[List[str]] = None


class RuleCheckin(BaseModel):
    member_id: str
    checkin_date: Optional[str] = None
    completed: bool = True


@router.get("")
async def list_rules(h: Household = Depends(get_household)):
    rules = await db.rules.find({"household_id": h.household_id}, {"_id": 0}).to_list(500)
    today_str = date.today().isoformat()
    checkins = await db.rule_checkins.find(
        {"household_id": h.household_id, "checkin_date": today_str}, {"_id": 0}
    ).to_list(2000)
    by_rule = {}
    for c in checkins:
        by_rule.setdefault(c["rule_id"], []).append(c["member_id"])
    for r in rules:
        r["completed_today_member_ids"] = by_rule.get(r["rule_id"], [])
    return {"rules": rules}


@router.post("")
async def create_rule(payload: RuleCreate, h: Household = Depends(get_household)):
    if payload.pillar not in PILLARS:
        raise HTTPException(status_code=400, detail=f"pillar must be one of {PILLARS}")
    if payload.cadence not in ("daily", "weekly"):
        raise HTTPException(status_code=400, detail="cadence must be daily or weekly")
    rid = make_id("rule")
    await db.rules.insert_one({
        "rule_id": rid, "household_id": h.household_id, "pillar": payload.pillar,
        "title": payload.title, "cadence": payload.cadence,
        "assigned_member_ids": payload.assigned_member_ids,
        "created_at": now_utc().isoformat(),
    })
    return {"rule_id": rid}


@router.patch("/{rule_id}")
async def update_rule(rule_id: str, payload: RuleUpdate, h: Household = Depends(get_household)):
    update = payload.model_dump(exclude_none=True)
    if update:
        await db.rules.update_one(
            {"rule_id": rule_id, "household_id": h.household_id}, {"$set": update}
        )
    return {"ok": True}


@router.delete("/{rule_id}")
async def delete_rule(rule_id: str, h: Household = Depends(get_household)):
    await db.rules.delete_one({"rule_id": rule_id, "household_id": h.household_id})
    await db.rule_checkins.delete_many({"rule_id": rule_id})
    return {"ok": True}


@router.post("/{rule_id}/checkin")
async def checkin_rule(rule_id: str, payload: RuleCheckin, h: Household = Depends(get_household)):
    rule = await db.rules.find_one({"rule_id": rule_id, "household_id": h.household_id}, {"_id": 0})
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    cdate = payload.checkin_date or date.today().isoformat()
    if payload.completed:
        await db.rule_checkins.update_one(
            {"rule_id": rule_id, "member_id": payload.member_id, "checkin_date": cdate},
            {"$setOnInsert": {
                "checkin_id": make_id("rc"), "rule_id": rule_id,
                "household_id": h.household_id, "member_id": payload.member_id,
                "checkin_date": cdate, "created_at": now_utc().isoformat(),
            }},
            upsert=True,
        )
    else:
        await db.rule_checkins.delete_one(
            {"rule_id": rule_id, "member_id": payload.member_id, "checkin_date": cdate}
        )
    return {"ok": True}
