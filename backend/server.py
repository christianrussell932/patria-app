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
    mission_statement: Optional[str] = None
    values: Optional[List[str]] = None
    technology_policy: Optional[str] = None
    roles: Optional[dict] = None


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

PILLARS = [
    # New household-order categories
    "spiritual", "financial", "order", "marriage", "children", "health", "hospitality",
    # Legacy categories — kept for backwards compatibility
    "prayer", "fasting", "almsgiving", "work", "rest", "formation",
]


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


# ---------- Budget & Stewardship ----------

class BudgetCategoryCreate(BaseModel):
    name: str
    monthly_limit: float = 0.0
    color: str = "slate"
    kind: str = "expense"  # expense | giving | savings


class BudgetCategoryUpdate(BaseModel):
    name: Optional[str] = None
    monthly_limit: Optional[float] = None
    color: Optional[str] = None
    kind: Optional[str] = None


@api.get("/budget/categories")
async def list_budget_categories(user: User = Depends(get_current_user)):
    h = await require_household(user)
    cats = await db.budget_categories.find(
        {"household_id": h.household_id}, {"_id": 0}
    ).to_list(200)
    return {"categories": cats}


@api.post("/budget/categories")
async def create_budget_category(payload: BudgetCategoryCreate, user: User = Depends(get_current_user)):
    h = await require_household(user)
    cid = make_id("bcat")
    doc = {
        "category_id": cid,
        "household_id": h.household_id,
        "name": payload.name,
        "monthly_limit": payload.monthly_limit,
        "color": payload.color,
        "kind": payload.kind,
        "created_at": now_utc().isoformat(),
    }
    await db.budget_categories.insert_one(doc)
    return {"category_id": cid}


@api.patch("/budget/categories/{category_id}")
async def update_budget_category(category_id: str, payload: BudgetCategoryUpdate, user: User = Depends(get_current_user)):
    h = await require_household(user)
    update = payload.model_dump(exclude_none=True)
    if update:
        await db.budget_categories.update_one(
            {"category_id": category_id, "household_id": h.household_id}, {"$set": update}
        )
    return {"ok": True}


@api.delete("/budget/categories/{category_id}")
async def delete_budget_category(category_id: str, user: User = Depends(get_current_user)):
    h = await require_household(user)
    await db.budget_categories.delete_one({"category_id": category_id, "household_id": h.household_id})
    await db.budget_transactions.delete_many({"category_id": category_id, "household_id": h.household_id})
    return {"ok": True}


class TransactionCreate(BaseModel):
    category_id: Optional[str] = None
    amount: float
    type: str = "expense"  # expense | income | giving
    note: Optional[str] = None
    txn_date: Optional[str] = None  # YYYY-MM-DD
    member_id: Optional[str] = None


@api.post("/budget/transactions")
async def create_transaction(payload: TransactionCreate, user: User = Depends(get_current_user)):
    h = await require_household(user)
    if payload.type not in ("expense", "income", "giving"):
        raise HTTPException(status_code=400, detail="type must be expense, income, or giving")
    if payload.amount is None or payload.amount < 0:
        raise HTTPException(status_code=400, detail="amount must be non-negative")
    tid = make_id("txn")
    doc = {
        "txn_id": tid,
        "household_id": h.household_id,
        "category_id": payload.category_id,
        "amount": payload.amount,
        "type": payload.type,
        "note": payload.note,
        "member_id": payload.member_id,
        "txn_date": payload.txn_date or date.today().isoformat(),
        "created_at": now_utc().isoformat(),
    }
    await db.budget_transactions.insert_one(doc)
    return {"txn_id": tid}


@api.get("/budget/transactions")
async def list_transactions(month: Optional[int] = None, year: Optional[int] = None, user: User = Depends(get_current_user)):
    h = await require_household(user)
    today = date.today()
    y = year or today.year
    m = month or today.month
    start = date(y, m, 1).isoformat()
    end_d = date(y + 1, 1, 1) if m == 12 else date(y, m + 1, 1)
    end = end_d.isoformat()
    txns = await db.budget_transactions.find(
        {"household_id": h.household_id, "txn_date": {"$gte": start, "$lt": end}},
        {"_id": 0},
    ).sort("txn_date", -1).to_list(2000)
    return {"month": m, "year": y, "transactions": txns}


@api.delete("/budget/transactions/{txn_id}")
async def delete_transaction(txn_id: str, user: User = Depends(get_current_user)):
    h = await require_household(user)
    await db.budget_transactions.delete_one({"txn_id": txn_id, "household_id": h.household_id})
    return {"ok": True}


@api.get("/budget/summary")
async def budget_summary(month: Optional[int] = None, year: Optional[int] = None, user: User = Depends(get_current_user)):
    h = await require_household(user)
    today = date.today()
    y = year or today.year
    m = month or today.month
    start = date(y, m, 1).isoformat()
    end_d = date(y + 1, 1, 1) if m == 12 else date(y, m + 1, 1)
    end = end_d.isoformat()

    cats = await db.budget_categories.find({"household_id": h.household_id}, {"_id": 0}).to_list(200)
    txns = await db.budget_transactions.find(
        {"household_id": h.household_id, "txn_date": {"$gte": start, "$lt": end}}, {"_id": 0}
    ).to_list(5000)

    income_total = sum(t["amount"] for t in txns if t["type"] == "income")
    expense_total = sum(t["amount"] for t in txns if t["type"] == "expense")
    giving_total = sum(t["amount"] for t in txns if t["type"] == "giving")

    by_cat = {}
    for t in txns:
        if t.get("category_id"):
            by_cat[t["category_id"]] = by_cat.get(t["category_id"], 0) + t["amount"]

    cat_progress = []
    for c in cats:
        spent = by_cat.get(c["category_id"], 0)
        cat_progress.append({
            **c,
            "spent": spent,
            "remaining": (c.get("monthly_limit") or 0) - spent,
            "pct": round((spent / c["monthly_limit"]) * 100, 1) if c.get("monthly_limit") else 0,
        })

    tithe_pct = round((giving_total / income_total) * 100, 1) if income_total else 0

    return {
        "month": m,
        "year": y,
        "income": income_total,
        "expense": expense_total,
        "giving": giving_total,
        "tithe_pct": tithe_pct,
        "net": income_total - expense_total - giving_total,
        "categories": cat_progress,
    }


class SavingsGoalCreate(BaseModel):
    name: str
    target_amount: float
    current_amount: float = 0.0
    deadline: Optional[str] = None
    color: str = "green"


class SavingsGoalUpdate(BaseModel):
    name: Optional[str] = None
    target_amount: Optional[float] = None
    current_amount: Optional[float] = None
    deadline: Optional[str] = None
    color: Optional[str] = None


@api.get("/budget/savings-goals")
async def list_savings_goals(user: User = Depends(get_current_user)):
    h = await require_household(user)
    goals = await db.savings_goals.find({"household_id": h.household_id}, {"_id": 0}).to_list(100)
    return {"goals": goals}


@api.post("/budget/savings-goals")
async def create_savings_goal(payload: SavingsGoalCreate, user: User = Depends(get_current_user)):
    h = await require_household(user)
    gid = make_id("sg")
    doc = {
        "goal_id": gid,
        "household_id": h.household_id,
        "name": payload.name,
        "target_amount": payload.target_amount,
        "current_amount": payload.current_amount,
        "deadline": payload.deadline,
        "color": payload.color,
        "created_at": now_utc().isoformat(),
    }
    await db.savings_goals.insert_one(doc)
    return {"goal_id": gid}


@api.patch("/budget/savings-goals/{goal_id}")
async def update_savings_goal(goal_id: str, payload: SavingsGoalUpdate, user: User = Depends(get_current_user)):
    h = await require_household(user)
    update = payload.model_dump(exclude_none=True)
    if update:
        await db.savings_goals.update_one(
            {"goal_id": goal_id, "household_id": h.household_id}, {"$set": update}
        )
    return {"ok": True}


@api.delete("/budget/savings-goals/{goal_id}")
async def delete_savings_goal(goal_id: str, user: User = Depends(get_current_user)):
    h = await require_household(user)
    await db.savings_goals.delete_one({"goal_id": goal_id, "household_id": h.household_id})
    return {"ok": True}


# ---------- Schedule ----------

class EventCreate(BaseModel):
    title: str
    event_date: str  # YYYY-MM-DD
    event_time: Optional[str] = None  # HH:MM
    type: str = "family"  # family | liturgical | date_night | medical | school | other
    notes: Optional[str] = None
    member_ids: List[str] = []


class EventUpdate(BaseModel):
    title: Optional[str] = None
    event_date: Optional[str] = None
    event_time: Optional[str] = None
    type: Optional[str] = None
    notes: Optional[str] = None
    member_ids: Optional[List[str]] = None


@api.get("/schedule/events")
async def list_events(start: Optional[str] = None, end: Optional[str] = None, user: User = Depends(get_current_user)):
    h = await require_household(user)
    q = {"household_id": h.household_id}
    if start or end:
        q["event_date"] = {}
        if start:
            q["event_date"]["$gte"] = start
        if end:
            q["event_date"]["$lte"] = end
    events = await db.events.find(q, {"_id": 0}).sort("event_date", 1).to_list(500)
    return {"events": events}


@api.post("/schedule/events")
async def create_event(payload: EventCreate, user: User = Depends(get_current_user)):
    h = await require_household(user)
    if payload.type not in ("family", "liturgical", "date_night", "school", "medical", "other"):
        raise HTTPException(status_code=400, detail="invalid event type")
    eid = make_id("evt")
    doc = {
        "event_id": eid,
        "household_id": h.household_id,
        **payload.model_dump(),
        "created_at": now_utc().isoformat(),
    }
    await db.events.insert_one(doc)
    return {"event_id": eid}


@api.patch("/schedule/events/{event_id}")
async def update_event(event_id: str, payload: EventUpdate, user: User = Depends(get_current_user)):
    h = await require_household(user)
    update = payload.model_dump(exclude_none=True)
    if update:
        await db.events.update_one(
            {"event_id": event_id, "household_id": h.household_id}, {"$set": update}
        )
    return {"ok": True}


@api.delete("/schedule/events/{event_id}")
async def delete_event(event_id: str, user: User = Depends(get_current_user)):
    h = await require_household(user)
    await db.events.delete_one({"event_id": event_id, "household_id": h.household_id})
    return {"ok": True}


# ---------- Household Tasks ----------

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


@api.get("/tasks")
async def list_tasks(include_completed: bool = False, user: User = Depends(get_current_user)):
    h = await require_household(user)
    q = {"household_id": h.household_id}
    if not include_completed:
        q["completed"] = False
    tasks = await db.tasks.find(q, {"_id": 0}).sort("due_date", 1).to_list(500)
    return {"tasks": tasks}


@api.post("/tasks")
async def create_task(payload: TaskCreate, user: User = Depends(get_current_user)):
    h = await require_household(user)
    tid = make_id("task")
    doc = {
        "task_id": tid,
        "household_id": h.household_id,
        **payload.model_dump(),
        "completed": False,
        "completed_at": None,
        "created_at": now_utc().isoformat(),
    }
    await db.tasks.insert_one(doc)
    return {"task_id": tid}


@api.patch("/tasks/{task_id}")
async def update_task(task_id: str, payload: TaskUpdate, user: User = Depends(get_current_user)):
    h = await require_household(user)
    update = payload.model_dump(exclude_none=True)
    if "completed" in update:
        update["completed_at"] = now_utc().isoformat() if update["completed"] else None
    if update:
        await db.tasks.update_one(
            {"task_id": task_id, "household_id": h.household_id}, {"$set": update}
        )
    return {"ok": True}


@api.delete("/tasks/{task_id}")
async def delete_task(task_id: str, user: User = Depends(get_current_user)):
    h = await require_household(user)
    await db.tasks.delete_one({"task_id": task_id, "household_id": h.household_id})
    return {"ok": True}


# ---------- Goals ----------

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


@api.get("/goals")
async def list_goals(user: User = Depends(get_current_user)):
    h = await require_household(user)
    goals = await db.family_goals.find(
        {"household_id": h.household_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(200)
    return {"goals": goals}


@api.post("/goals")
async def create_goal(payload: GoalCreate, user: User = Depends(get_current_user)):
    h = await require_household(user)
    data = payload.model_dump()
    data["progress"] = max(0, min(100, data.get("progress", 0)))
    if data.get("scope") not in ("short", "long"):
        raise HTTPException(status_code=400, detail="scope must be short or long")
    gid = make_id("goal")
    doc = {
        "goal_id": gid,
        "household_id": h.household_id,
        **data,
        "completed": False,
        "created_at": now_utc().isoformat(),
    }
    await db.family_goals.insert_one(doc)
    return {"goal_id": gid}


@api.patch("/goals/{goal_id}")
async def update_goal(goal_id: str, payload: GoalUpdate, user: User = Depends(get_current_user)):
    h = await require_household(user)
    update = payload.model_dump(exclude_none=True)
    if "progress" in update:
        update["progress"] = max(0, min(100, update["progress"]))
    if update:
        await db.family_goals.update_one(
            {"goal_id": goal_id, "household_id": h.household_id}, {"$set": update}
        )
    return {"ok": True}


@api.delete("/goals/{goal_id}")
async def delete_goal(goal_id: str, user: User = Depends(get_current_user)):
    h = await require_household(user)
    await db.family_goals.delete_one({"goal_id": goal_id, "household_id": h.household_id})
    return {"ok": True}


# ---------- Dashboard ----------

@api.get("/dashboard")
async def dashboard(user: User = Depends(get_current_user)):
    h = await require_household(user)
    today = date.today()
    today_str = today.isoformat()
    week_start_str = (today - timedelta(days=6)).isoformat()
    week_end_str = (today + timedelta(days=7)).isoformat()

    # Liturgical
    lit = liturgical_for(today)

    # Members
    members = await db.members.find({"household_id": h.household_id}, {"_id": 0}).to_list(50)

    # Today's schedule
    todays_events = await db.events.find(
        {"household_id": h.household_id, "event_date": today_str}, {"_id": 0}
    ).sort("event_time", 1).to_list(50)
    upcoming_events = await db.events.find(
        {"household_id": h.household_id, "event_date": {"$gt": today_str, "$lte": week_end_str}},
        {"_id": 0},
    ).sort("event_date", 1).to_list(20)

    # Date night: next event of type date_night
    date_night = await db.events.find_one(
        {"household_id": h.household_id, "type": "date_night", "event_date": {"$gte": today_str}},
        {"_id": 0},
        sort=[("event_date", 1)],
    )

    # Tasks
    open_tasks = await db.tasks.find(
        {"household_id": h.household_id, "completed": False}, {"_id": 0}
    ).sort("due_date", 1).to_list(20)
    tasks_due_today = [t for t in open_tasks if t.get("due_date") == today_str]
    tasks_overdue = [t for t in open_tasks if t.get("due_date") and t["due_date"] < today_str]

    # Prayer streak — consecutive days at least one log in household
    streak = 0
    cursor_date = today
    for _ in range(60):
        cnt = await db.prayer_logs.count_documents(
            {"household_id": h.household_id, "log_date": cursor_date.isoformat()}
        )
        if cnt > 0:
            streak += 1
            cursor_date -= timedelta(days=1)
        else:
            # If today has no log, don't break the streak — start counting yesterday
            if cursor_date == today:
                cursor_date -= timedelta(days=1)
                continue
            break
    week_prayer_count = await db.prayer_logs.count_documents(
        {"household_id": h.household_id, "log_date": {"$gte": week_start_str}}
    )

    # Budget summary (current month)
    y, m = today.year, today.month
    m_start = date(y, m, 1).isoformat()
    m_end_d = date(y + 1, 1, 1) if m == 12 else date(y, m + 1, 1)
    m_end = m_end_d.isoformat()
    txns = await db.budget_transactions.find(
        {"household_id": h.household_id, "txn_date": {"$gte": m_start, "$lt": m_end}}, {"_id": 0}
    ).to_list(2000)
    income = sum(t["amount"] for t in txns if t["type"] == "income")
    expense = sum(t["amount"] for t in txns if t["type"] == "expense")
    giving = sum(t["amount"] for t in txns if t["type"] == "giving")
    cats = await db.budget_categories.find({"household_id": h.household_id}, {"_id": 0}).to_list(100)
    over_cats = []
    for c in cats:
        if not c.get("monthly_limit"):
            continue
        spent = sum(t["amount"] for t in txns if t.get("category_id") == c["category_id"])
        if spent > c["monthly_limit"]:
            over_cats.append({"name": c["name"], "spent": spent, "limit": c["monthly_limit"]})

    # Active challenge
    active_ch = await db.challenges.find_one(
        {"household_id": h.household_id, "status": "active"}, {"_id": 0}
    )
    if active_ch:
        try:
            sd = date.fromisoformat(active_ch["start_date"])
            day_num = (today - sd).days + 1
        except Exception:
            day_num = 1
        active_ch["current_day"] = max(1, min(day_num, active_ch["days_total"]))
        active_ch["completion_pct"] = round(
            ((active_ch["current_day"] - 1) / active_ch["days_total"]) * 100, 1
        ) if active_ch["days_total"] else 0

    # Goals progress
    goals = await db.family_goals.find(
        {"household_id": h.household_id, "completed": False}, {"_id": 0}
    ).sort("created_at", -1).to_list(20)
    avg_progress = round(sum(g.get("progress", 0) for g in goals) / len(goals), 0) if goals else 0

    # Household weekly score (composite)
    rules = await db.rules.find({"household_id": h.household_id}, {"_id": 0}).to_list(500)
    rule_checkins_week = await db.rule_checkins.count_documents(
        {"household_id": h.household_id, "checkin_date": {"$gte": week_start_str}}
    )
    expected_rule_checkins = max(1, len(rules) * max(1, len(members)) * 7)
    rule_pct = min(100, round((rule_checkins_week / expected_rule_checkins) * 100))
    prayer_pct = min(100, round((week_prayer_count / max(1, len(members) * 7)) * 100))
    task_pct = 100 if not tasks_overdue else max(0, 100 - len(tasks_overdue) * 10)
    budget_pct = 100 if not over_cats else max(0, 100 - len(over_cats) * 15)
    weekly_score = round((rule_pct + prayer_pct + task_pct + budget_pct) / 4)

    # Household details
    house = await db.households.find_one({"household_id": h.household_id}, {"_id": 0})

    return {
        "household": house,
        "members_count": len(members),
        "liturgical": lit,
        "today": today_str,
        "todays_events": todays_events,
        "upcoming_events": upcoming_events,
        "date_night": date_night,
        "tasks": {
            "due_today": tasks_due_today,
            "overdue": tasks_overdue,
            "open_count": len(open_tasks),
        },
        "prayer": {
            "streak_days": streak,
            "week_count": week_prayer_count,
        },
        "budget": {
            "income": income,
            "expense": expense,
            "giving": giving,
            "net": income - expense - giving,
            "tithe_pct": round((giving / income) * 100, 1) if income else 0,
            "over_categories": over_cats,
        },
        "active_challenge": active_ch,
        "goals": {
            "items": goals[:3],
            "avg_progress": avg_progress,
            "open_count": len(goals),
        },
        "weekly_score": {
            "total": weekly_score,
            "rule_pct": rule_pct,
            "prayer_pct": prayer_pct,
            "tasks_pct": task_pct,
            "budget_pct": budget_pct,
        },
    }


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
