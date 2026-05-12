"""Challenges router — seasons and devotional arcs."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import date

from deps import db, get_household, now_utc, make_id, Household
from challenges import list_templates, get_template

router = APIRouter(prefix="/challenges", tags=["challenges"])


class ChallengeStart(BaseModel):
    template_key: Optional[str] = None
    title: Optional[str] = None
    days_total: Optional[int] = None
    color: Optional[str] = "violet"
    start_date: Optional[str] = None
    member_ids: List[str] = []


class ChallengeCheckin(BaseModel):
    member_id: str
    checkin_date: Optional[str] = None
    completed: bool = True


@router.get("/templates")
async def challenge_templates():
    return {"templates": list_templates()}


@router.post("/start")
async def start_challenge(payload: ChallengeStart, h: Household = Depends(get_household)):
    title = payload.title
    days_total = payload.days_total
    color = payload.color or "violet"
    if payload.template_key:
        tpl = get_template(payload.template_key)
        if not tpl:
            raise HTTPException(status_code=404, detail="Template not found")
        title = tpl["title"]
        days_total = tpl["days_total"]
        color = tpl["color"]
    if not title or not days_total:
        raise HTTPException(status_code=400, detail="title and days_total required")
    cid = make_id("ch")
    await db.challenges.insert_one({
        "challenge_id": cid, "household_id": h.household_id,
        "template_key": payload.template_key, "title": title, "days_total": days_total,
        "color": color, "start_date": payload.start_date or date.today().isoformat(),
        "member_ids": payload.member_ids, "status": "active",
        "created_at": now_utc().isoformat(),
    })
    return {"challenge_id": cid}


@router.get("/active")
async def active_challenges(h: Household = Depends(get_household)):
    chals = await db.challenges.find(
        {"household_id": h.household_id, "status": "active"}, {"_id": 0}
    ).to_list(50)
    today_str = date.today().isoformat()
    for c in chals:
        try:
            sd = date.fromisoformat(c["start_date"])
            day_num = (date.today() - sd).days + 1
        except Exception:
            day_num = 1
        c["current_day"] = max(1, min(day_num, c["days_total"]))
        c["completion_pct"] = round(((c["current_day"] - 1) / c["days_total"]) * 100, 1) if c["days_total"] else 0
        ch_ck = await db.challenge_checkins.find({"challenge_id": c["challenge_id"]}, {"_id": 0}).to_list(5000)
        per_member = {}
        for ck in ch_ck:
            per_member.setdefault(ck["member_id"], set()).add(ck["checkin_date"])
        c["member_progress"] = {mid: len(days) for mid, days in per_member.items()}
        c["completed_today_member_ids"] = [
            ck["member_id"] for ck in ch_ck if ck["checkin_date"] == today_str
        ]
    return {"challenges": chals}


@router.post("/{challenge_id}/checkin")
async def checkin_challenge(challenge_id: str, payload: ChallengeCheckin, h: Household = Depends(get_household)):
    c = await db.challenges.find_one(
        {"challenge_id": challenge_id, "household_id": h.household_id}, {"_id": 0}
    )
    if not c:
        raise HTTPException(status_code=404, detail="Challenge not found")
    cdate = payload.checkin_date or date.today().isoformat()
    if payload.completed:
        await db.challenge_checkins.update_one(
            {"challenge_id": challenge_id, "member_id": payload.member_id, "checkin_date": cdate},
            {"$setOnInsert": {
                "checkin_id": make_id("cck"), "challenge_id": challenge_id,
                "household_id": h.household_id, "member_id": payload.member_id,
                "checkin_date": cdate, "created_at": now_utc().isoformat(),
            }},
            upsert=True,
        )
    else:
        await db.challenge_checkins.delete_one(
            {"challenge_id": challenge_id, "member_id": payload.member_id, "checkin_date": cdate}
        )
    return {"ok": True}


@router.post("/{challenge_id}/end")
async def end_challenge(challenge_id: str, h: Household = Depends(get_household)):
    await db.challenges.update_one(
        {"challenge_id": challenge_id, "household_id": h.household_id},
        {"$set": {"status": "completed"}},
    )
    return {"ok": True}
