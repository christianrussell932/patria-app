"""Shared dependencies, models, and helpers for Patria backend routers."""
from fastapi import HTTPException, Request, Depends
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone, timedelta, date
import os
import uuid

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

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
    role: str
    color: str
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


# ---------- Helpers ----------

def now_utc():
    return datetime.now(timezone.utc)


def make_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def monday_of_week(d: date) -> date:
    return d - timedelta(days=d.weekday())


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


async def get_household(user: User = Depends(get_current_user)) -> Household:
    """FastAPI dependency: current household for the authenticated user."""
    return await require_household(user)
