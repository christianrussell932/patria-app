"""Auth router — Emergent-managed Google OAuth."""
from fastapi import APIRouter, HTTPException, Request, Response, Depends
from datetime import timedelta
import httpx

from deps import db, get_current_user, now_utc, make_id, User, EMERGENT_SESSION_URL

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/session")
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
        await db.users.update_one({"user_id": user_id}, {"$set": {"name": name, "picture": picture}})
    else:
        user_id = make_id("user")
        await db.users.insert_one({
            "user_id": user_id, "email": email, "name": name, "picture": picture,
            "current_household_id": None, "created_at": now_utc().isoformat(),
        })

    expires_at = now_utc() + timedelta(days=7)
    await db.user_sessions.insert_one({
        "user_id": user_id, "session_token": session_token,
        "expires_at": expires_at.isoformat(), "created_at": now_utc().isoformat(),
    })
    response.set_cookie(
        key="session_token", value=session_token, max_age=7 * 24 * 60 * 60,
        path="/", httponly=True, secure=True, samesite="none",
    )
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return {
        "user": {
            "user_id": user_doc["user_id"], "email": user_doc["email"],
            "name": user_doc["name"], "picture": user_doc.get("picture"),
            "current_household_id": user_doc.get("current_household_id"),
        },
        "session_token": session_token,
    }


@router.get("/me")
async def auth_me(user: User = Depends(get_current_user)):
    return {
        "user_id": user.user_id, "email": user.email, "name": user.name,
        "picture": user.picture, "current_household_id": user.current_household_id,
    }


@router.post("/logout")
async def auth_logout(request: Request, response: Response):
    token = request.cookies.get("session_token") or ""
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    response.delete_cookie("session_token", path="/")
    return {"ok": True}
