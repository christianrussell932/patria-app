"""Catholic Household OS — backend API.

Auth: Emergent-managed Google login (session_id -> session_token cookie).
"""
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import httpx
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone, timedelta, date

from liturgical import liturgical_for, liturgical_month
from challenges import list_templates, get_template

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="Catholic Household OS API")
api = APIRouter(prefix="/api")

EMERGENT_SESSION_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"

# ---------- Models ----------

class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    current_household_id: Optional[str] = None
    created_at: datetime


class Member(BaseModel):
    member_id: str
    household_id: str
    name: str
    role: str  # parent | child
    color: str  # tile color tone (e.g., "green","violet","white","red","rose","slate")
    patron_saint: Optional[str] = None
    linked_user_id: Optional[str] = None
    created_at: datetime


class Household(BaseModel):
    household_id: str
    name: str
    patron_saint: Optional[str] = None
    calendar_variant: str = "roman"
    created_by: str
    created_at: datetime


class Rule(BaseModel):
    rule_id: str
    household_id: str
    pillar: str  # prayer|fasting|almsgiving|work|rest|formation|hospitality
    title: str
    cadence: str  # daily | weekly
    assigned_member_ids: List[str] = []
    created_at: datetime


class PrayerLog(BaseModel):
    log_id: str
    household_id: str
    member_id: str
    prayer_type: str  # morning_offering | rosary | divine_mercy | examen | lectio_divina | angelus | other
    detail: Optional[str] = None  # e.g., mystery
    log_date: str  # YYYY-MM-DD
    created_at: datetime


class Challenge(BaseModel):
    challenge_id: str
    household_id: str
    template_key: Optional[str]
    title: str
    days_total: int
    color: str
    start_date: str  # YYYY-MM-DD
    member_ids: List[str] = []
    status: str = "active"
    created_at: datetime


# ---------- Helpers ----------

def now_utc():
    return datetime.now(timezone.utc)


def make_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


async def get_current_user(request: Request) -> User:
    token = request.cookies.get("session_token")
    if not token:
        auth = request.headers.get("Authorization")
        if auth and auth.lower().startswith("bearer "):
            token = auth.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    sess = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not sess:
        raise HTTPException(status_code=401, detail="Invalid session")

    expires_at = sess.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at and expires_at < now_utc():
        raise HTTPException(status_code=401, detail="Session expired")

    user_doc = await db.users.find_one({"user_id": sess["user_id"]}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")
    if isinstance(user_doc.get("created_at"), str):
        user_doc["created_at"] = datetime.fromisoformat(user_doc["created_at"])
    return User(**user_doc)


async def require_household(user: User) -> Household:
    if not user.current_household_id:
        raise HTTPException(status_code=400, detail="No active household")
    h = await db.households.find_one({"household_id": user.current_household_id}, {"_id": 0})
    if not h:
        raise HTTPException(status_code=404, detail="Household not found")
    if isinstance(h.get("created_at"), str):
        h["created_at"] = datetime.fromisoformat(h["created_at"])
    return Household(**h)


# ---------- Auth ----------

@api.post("/auth/session")
async def auth_session(request: Request, response: Response):
    body = await request.json()
    session_id = body.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")

    async with httpx.AsyncClient(timeout=10) as hc:
        r = await hc.get(EMERGENT_SESSION_URL, headers={"X-Session-ID": session_id})
        if r.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session_id")
        data = r.json()

    email = data["email"]
    name = data.get("name") or email.split("@")[0]
    picture = data.get("picture")
    session_token = data["session_token"]

    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": name, "picture": picture}}
        )
    else:
        user_id = make_id("user")
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "current_household_id": None,
            "created_at": now_utc().isoformat(),
        })

    expires_at = now_utc() + timedelta(days=7)
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": now_utc().isoformat(),
    })

    response.set_cookie(
        key="session_token",
        value=session_token,
        max_age=7 * 24 * 60 * 60,
        path="/",
        httponly=True,
        secure=True,
        samesite="none",
    )

    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return {
        "user": {
            "user_id": user_doc["user_id"],
            "email": user_doc["email"],
            "name": user_doc["name"],
            "picture": user_doc.get("picture"),
            "current_household_id": user_doc.get("current_household_id"),
        },
        "session_token": session_token,
    }


@api.get("/auth/me")
async def auth_me(user: User = Depends(get_current_user)):
    return {
        "user_id": user.user_id,
        "email": user.email,
        "name": user.name,
        "picture": user.picture,
        "current_household_id": user.current_household_id,
    }


@api.post("/auth/logout")
async def auth_logout(request: Request, response: Response):
    token = request.cookies.get("session_token") or ""
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    response.delete_cookie("session_token", path="/")
    return {"ok": True}


# ---------- Household ----------

class HouseholdCreate(BaseModel):
    name: str
    patron_saint: Optional[str] = None
    calendar_variant: str = "roman"
    parent_name: Optional[str] = None  # primary parent member name
    parent_color: str = "violet"


@api.post("/household")
async def create_household(payload: HouseholdCreate, user: User = Depends(get_current_user)):
    hid = make_id("hh")
    doc = {
        "household_id": hid,
        "name": payload.name,
        "patron_saint": payload.patron_saint,
        "calendar_variant": payload.calendar_variant,
        "created_by": user.user_id,
        "created_at": now_utc().isoformat(),
    }
    await db.households.insert_one(doc)

    # Create primary parent member linked to this user
    member_id = make_id("mem")
    await db.members.insert_one({
        "member_id": member_id,
        "household_id": hid,
        "name": payload.parent_name or user.name,
        "role": "parent",
        "color": payload.parent_color,
        "patron_saint": None,
        "linked_user_id": user.user_id,
        "created_at": now_utc().isoformat(),
    })

    await db.users.update_one({"user_id": user.user_id}, {"$set": {"current_household_id": hid}})
    return {"household_id": hid}


@api.get("/household/me")
async def get_my_household(user: User = Depends(get_current_user)):
    if not user.current_household_id:
        return {"household": None, "members": []}
    h = await db.households.find_one({"household_id": user.current_household_id}, {"_id": 0})
    if not h:
        return {"household": None, "members": []}
    members = await db.members.find({"household_id": user.current_household_id}, {"_id": 0}).to_list(200)
    return {"household": h, "members": members}


class HouseholdUpdate(BaseModel):
    name: Optional[str] = None
    patron_saint: Optional[str] = None
    calendar_variant: Optional[str] = None


@api.patch("/household")
async def update_household(payload: HouseholdUpdate, user: User = Depends(get_current_user)):
    h = await require_household(user)
    update = {k: v for k, v in payload.model_dump(exclude_none=True).items()}
    if update:
        await db.households.update_one({"household_id": h.household_id}, {"$set": update})
    return {"ok": True}


class MemberCreate(BaseModel):
    name: str
    role: str  # parent | child
    color: str = "slate"
    patron_saint: Optional[str] = None


@api.post("/household/members")
async def add_member(payload: MemberCreate, user: User = Depends(get_current_user)):
    h = await require_household(user)
    if payload.role not in ("parent", "child"):
        raise HTTPException(status_code=400, detail="role must be parent or child")
    member_id = make_id("mem")
    doc = {
        "member_id": member_id,
        "household_id": h.household_id,
        "name": payload.name,
        "role": payload.role,
        "color": payload.color,
        "patron_saint": payload.patron_saint,
        "linked_user_id": None,
        "created_at": now_utc().isoformat(),
    }
    await db.members.insert_one(doc)
    return {"member_id": member_id}


@api.delete("/household/members/{member_id}")
async def delete_member(member_id: str, user: User = Depends(get_current_user)):
    h = await require_household(user)
    m = await db.members.find_one({"member_id": member_id, "household_id": h.household_id}, {"_id": 0})
    if not m:
        raise HTTPException(status_code=404, detail="Member not found")
    if m.get("linked_user_id") == user.user_id:
        raise HTTPException(status_code=400, detail="Cannot remove your own primary profile")
    await db.members.delete_one({"member_id": member_id})
    # Cleanup references in rules
    await db.rules.update_many(
        {"household_id": h.household_id},
        {"$pull": {"assigned_member_ids": member_id}},
    )
    return {"ok": True}


# ---------- Liturgical ----------

@api.get("/liturgical/today")
async def liturgical_today(d: Optional[str] = None):
    target = date.fromisoformat(d) if d else date.today()
    return liturgical_for(target)


@api.get("/liturgical/calendar")
async def liturgical_calendar(year: int, month: int):
    return {"year": year, "month": month, "days": liturgical_month(year, month)}


# ---------- Rule of Life ----------

PILLARS = ["prayer", "fasting", "almsgiving", "work", "rest", "formation", "hospitality"]


class RuleCreate(BaseModel):
    pillar: str
    title: str
    cadence: str = "daily"
    assigned_member_ids: List[str] = []


@api.get("/rules")
async def list_rules(user: User = Depends(get_current_user)):
    h = await require_household(user)
    rules = await db.rules.find({"household_id": h.household_id}, {"_id": 0}).to_list(500)
    # Today's check-ins per rule
    today_str = date.today().isoformat()
    checkins = await db.rule_checkins.find(
        {"household_id": h.household_id, "checkin_date": today_str}, {"_id": 0}
    ).to_list(2000)
    # Map rule_id -> set(member_id)
    by_rule = {}
    for c in checkins:
        by_rule.setdefault(c["rule_id"], []).append(c["member_id"])
    for r in rules:
        r["completed_today_member_ids"] = by_rule.get(r["rule_id"], [])
    return {"rules": rules}


@api.post("/rules")
async def create_rule(payload: RuleCreate, user: User = Depends(get_current_user)):
    h = await require_household(user)
    if payload.pillar not in PILLARS:
        raise HTTPException(status_code=400, detail=f"pillar must be one of {PILLARS}")
    if payload.cadence not in ("daily", "weekly"):
        raise HTTPException(status_code=400, detail="cadence must be daily or weekly")
    rid = make_id("rule")
    doc = {
        "rule_id": rid,
        "household_id": h.household_id,
        "pillar": payload.pillar,
        "title": payload.title,
        "cadence": payload.cadence,
        "assigned_member_ids": payload.assigned_member_ids,
        "created_at": now_utc().isoformat(),
    }
    await db.rules.insert_one(doc)
    return {"rule_id": rid}


class RuleUpdate(BaseModel):
    title: Optional[str] = None
    cadence: Optional[str] = None
    assigned_member_ids: Optional[List[str]] = None


@api.patch("/rules/{rule_id}")
async def update_rule(rule_id: str, payload: RuleUpdate, user: User = Depends(get_current_user)):
    h = await require_household(user)
    update = payload.model_dump(exclude_none=True)
    if update:
        await db.rules.update_one(
            {"rule_id": rule_id, "household_id": h.household_id}, {"$set": update}
        )
    return {"ok": True}


@api.delete("/rules/{rule_id}")
async def delete_rule(rule_id: str, user: User = Depends(get_current_user)):
    h = await require_household(user)
    await db.rules.delete_one({"rule_id": rule_id, "household_id": h.household_id})
    await db.rule_checkins.delete_many({"rule_id": rule_id})
    return {"ok": True}


class RuleCheckin(BaseModel):
    member_id: str
    checkin_date: Optional[str] = None  # default today
    completed: bool = True


@api.post("/rules/{rule_id}/checkin")
async def checkin_rule(rule_id: str, payload: RuleCheckin, user: User = Depends(get_current_user)):
    h = await require_household(user)
    rule = await db.rules.find_one({"rule_id": rule_id, "household_id": h.household_id}, {"_id": 0})
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    cdate = payload.checkin_date or date.today().isoformat()
    if payload.completed:
        await db.rule_checkins.update_one(
            {"rule_id": rule_id, "member_id": payload.member_id, "checkin_date": cdate},
            {"$setOnInsert": {
                "checkin_id": make_id("rc"),
                "rule_id": rule_id,
                "household_id": h.household_id,
                "member_id": payload.member_id,
                "checkin_date": cdate,
                "created_at": now_utc().isoformat(),
            }},
            upsert=True,
        )
    else:
        await db.rule_checkins.delete_one(
            {"rule_id": rule_id, "member_id": payload.member_id, "checkin_date": cdate}
        )
    return {"ok": True}


# ---------- Prayer Tracker ----------

class PrayerLogCreate(BaseModel):
    member_id: str
    prayer_type: str
    detail: Optional[str] = None
    log_date: Optional[str] = None


@api.post("/prayer/log")
async def log_prayer(payload: PrayerLogCreate, user: User = Depends(get_current_user)):
    h = await require_household(user)
    log_date = payload.log_date or date.today().isoformat()
    doc = {
        "log_id": make_id("plog"),
        "household_id": h.household_id,
        "member_id": payload.member_id,
        "prayer_type": payload.prayer_type,
        "detail": payload.detail,
        "log_date": log_date,
        "created_at": now_utc().isoformat(),
    }
    await db.prayer_logs.insert_one(doc)
    return {"log_id": doc["log_id"]}


@api.delete("/prayer/log/{log_id}")
async def delete_prayer_log(log_id: str, user: User = Depends(get_current_user)):
    h = await require_household(user)
    await db.prayer_logs.delete_one({"log_id": log_id, "household_id": h.household_id})
    return {"ok": True}


@api.get("/prayer/log")
async def get_prayer_log(log_date: Optional[str] = None, user: User = Depends(get_current_user)):
    h = await require_household(user)
    cdate = log_date or date.today().isoformat()
    logs = await db.prayer_logs.find(
        {"household_id": h.household_id, "log_date": cdate}, {"_id": 0}
    ).to_list(500)
    return {"date": cdate, "logs": logs}


@api.get("/prayer/stats")
async def prayer_stats(user: User = Depends(get_current_user)):
    h = await require_household(user)
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


# ---------- Challenges ----------

@api.get("/challenges/templates")
async def challenge_templates():
    return {"templates": list_templates()}


class ChallengeStart(BaseModel):
    template_key: Optional[str] = None
    title: Optional[str] = None
    days_total: Optional[int] = None
    color: Optional[str] = "violet"
    start_date: Optional[str] = None
    member_ids: List[str] = []


@api.post("/challenges/start")
async def start_challenge(payload: ChallengeStart, user: User = Depends(get_current_user)):
    h = await require_household(user)
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
    doc = {
        "challenge_id": cid,
        "household_id": h.household_id,
        "template_key": payload.template_key,
        "title": title,
        "days_total": days_total,
        "color": color,
        "start_date": payload.start_date or date.today().isoformat(),
        "member_ids": payload.member_ids,
        "status": "active",
        "created_at": now_utc().isoformat(),
    }
    await db.challenges.insert_one(doc)
    return {"challenge_id": cid}


@api.get("/challenges/active")
async def active_challenges(user: User = Depends(get_current_user)):
    h = await require_household(user)
    chals = await db.challenges.find(
        {"household_id": h.household_id, "status": "active"}, {"_id": 0}
    ).to_list(50)
    today_str = date.today().isoformat()
    for c in chals:
        # current day number
        try:
            sd = date.fromisoformat(c["start_date"])
            day_num = (date.today() - sd).days + 1
        except Exception:
            day_num = 1
        c["current_day"] = max(1, min(day_num, c["days_total"]))
        c["completion_pct"] = round(((c["current_day"] - 1) / c["days_total"]) * 100, 1) if c["days_total"] else 0

        # checkins per member, count unique days
        ch_ck = await db.challenge_checkins.find(
            {"challenge_id": c["challenge_id"]}, {"_id": 0}
        ).to_list(5000)
        per_member = {}
        for ck in ch_ck:
            per_member.setdefault(ck["member_id"], set()).add(ck["checkin_date"])
        c["member_progress"] = {mid: len(days) for mid, days in per_member.items()}
        # household-level: members who already checked in today
        c["completed_today_member_ids"] = [
            ck["member_id"] for ck in ch_ck if ck["checkin_date"] == today_str
        ]
    return {"challenges": chals}


class ChallengeCheckin(BaseModel):
    member_id: str
    checkin_date: Optional[str] = None
    completed: bool = True


@api.post("/challenges/{challenge_id}/checkin")
async def checkin_challenge(
    challenge_id: str, payload: ChallengeCheckin, user: User = Depends(get_current_user)
):
    h = await require_household(user)
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
                "checkin_id": make_id("cck"),
                "challenge_id": challenge_id,
                "household_id": h.household_id,
                "member_id": payload.member_id,
                "checkin_date": cdate,
                "created_at": now_utc().isoformat(),
            }},
            upsert=True,
        )
    else:
        await db.challenge_checkins.delete_one(
            {"challenge_id": challenge_id, "member_id": payload.member_id, "checkin_date": cdate}
        )
    return {"ok": True}


@api.post("/challenges/{challenge_id}/end")
async def end_challenge(challenge_id: str, user: User = Depends(get_current_user)):
    h = await require_household(user)
    await db.challenges.update_one(
        {"challenge_id": challenge_id, "household_id": h.household_id},
        {"$set": {"status": "completed"}},
    )
    return {"ok": True}


# ---------- Misc ----------

@api.get("/")
async def root():
    return {"app": "Catholic Household OS", "version": "0.1.0"}


# ---------- Mount ----------

app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
