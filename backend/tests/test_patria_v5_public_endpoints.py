"""End-to-end smoke tests against the public REACT_APP_BACKEND_URL for v0.5.

Verifies the four correctness fixes are live on the deployed preview:
- Refactored routers still answer all /api endpoints (smoke).
- Council finalize is idempotent via the public URL.
- Rhythm next_due via relativedelta.
- Sacred Heart anniversary via relativedelta.
- Liturgical Traditional 1962 Sundays-after-Epiphany resumption rubric.
"""
import os
import time
import requests
import pytest
from datetime import date, datetime, timezone, timedelta
from pymongo import MongoClient

BASE_URL = os.environ.get(
    "REACT_APP_BACKEND_URL",
    "https://emergent-blueprint-2.preview.emergentagent.com",
).rstrip("/")


@pytest.fixture(scope="module")
def mongo():
    return MongoClient("mongodb://localhost:27017")["test_database"]


@pytest.fixture(scope="module")
def public_session(mongo):
    """Seed a throwaway user + session + household for public-URL tests."""
    ts = int(time.time() * 1000)
    user_id = f"test-user-pub-{ts}"
    token = f"test_session_pub_{ts}"
    hid = f"hh-pub-{ts}"
    now = datetime.now(timezone.utc)
    mongo.users.insert_one({
        "user_id": user_id, "email": f"test.user.pub.{ts}@example.com",
        "name": "Pub Tester", "picture": None,
        "current_household_id": hid, "created_at": now.isoformat(),
    })
    mongo.user_sessions.insert_one({
        "user_id": user_id, "session_token": token,
        "expires_at": (now + timedelta(days=7)).isoformat(),
        "created_at": now.isoformat(),
    })
    mongo.households.insert_one({
        "household_id": hid, "name": "Pub Household", "patron_saint": None,
        "calendar_variant": "traditional", "created_by": user_id,
        "created_at": now.isoformat(),
    })
    yield {"user_id": user_id, "token": token, "household_id": hid}
    mongo.tasks.delete_many({"household_id": hid})
    mongo.meetings.delete_many({"household_id": hid})
    mongo.rhythms.delete_many({"household_id": hid})
    mongo.sacred_heart.delete_many({"household_id": hid})
    mongo.households.delete_many({"household_id": hid})
    mongo.user_sessions.delete_many({"session_token": token})
    mongo.users.delete_many({"user_id": user_id})


@pytest.fixture(scope="module")
def auth(public_session):
    s = requests.Session()
    s.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {public_session['token']}",
    })
    return s


# --- Refactor smoke: all router prefixes reachable -------------------------

@pytest.mark.parametrize("path", [
    "/api/",
    "/api/auth/me",
    "/api/household/me",
    "/api/liturgical/today",
    "/api/rules",
    "/api/prayer/stats",
    "/api/challenges/templates",
    "/api/challenges/active",
    "/api/budget/categories",
    "/api/budget/summary",
    "/api/budget/savings-goals",
    "/api/schedule/events",
    "/api/tasks",
    "/api/goals",
    "/api/dashboard",
    "/api/council/agenda",
    "/api/council/meetings",
    "/api/sacred-heart/state",
    "/api/rhythms",
])
def test_router_reachable(auth, path):
    r = auth.get(f"{BASE_URL}{path}")
    assert r.status_code == 200, f"{path} -> {r.status_code} {r.text[:200]}"


def test_root_version():
    r = requests.get(f"{BASE_URL}/api/")
    assert r.status_code == 200
    assert r.json().get("version") == "0.2.0"


# --- Council finalize idempotency over the public URL ----------------------

def test_public_council_finalize_idempotent(auth):
    mid = auth.post(f"{BASE_URL}/api/council/meeting", json={}).json()["meeting_id"]
    auth.patch(f"{BASE_URL}/api/council/meeting/{mid}",
               json={"assignments": [{"title": "TEST_Buy candles"},
                                     {"title": "TEST_Schedule confession"}]})
    r1 = auth.post(f"{BASE_URL}/api/council/meeting/{mid}/finalize").json()
    assert r1["tasks_created"] == 2 and r1["already"] is False, r1
    r2 = auth.post(f"{BASE_URL}/api/council/meeting/{mid}/finalize").json()
    assert r2["tasks_created"] == 0 and r2["already"] is True, r2

    # Drop aids and add a new title — only 1 new task.
    auth.patch(f"{BASE_URL}/api/council/meeting/{mid}",
               json={"assignments": [{"title": "TEST_Buy candles"},
                                     {"title": "TEST_Schedule confession"},
                                     {"title": "TEST_Plan retreat"}]})
    r3 = auth.post(f"{BASE_URL}/api/council/meeting/{mid}/finalize").json()
    assert r3["tasks_created"] == 1, r3
    assert r3["tasks_existing"] == 2, r3

    # Verify tasks listing exposes source_meeting_id + category=council
    tasks = auth.get(f"{BASE_URL}/api/tasks?include_completed=true").json()["tasks"]
    council_tasks = [t for t in tasks if t.get("source_meeting_id") == mid]
    assert len(council_tasks) == 3
    assert all(t.get("category") == "council" for t in council_tasks)


# --- Rhythm next_due via relativedelta -------------------------------------

def test_public_rhythm_monthly_next_due(auth):
    """Create a monthly rhythm, observe it, verify next_due is +1 calendar month."""
    r = auth.post(f"{BASE_URL}/api/rhythms",
                  json={"name": "TEST_Confession", "cadence": "monthly"})
    assert r.status_code == 200, r.text
    rid = r.json()["rhythm_id"]
    today = date.today().isoformat()
    obs = auth.post(f"{BASE_URL}/api/rhythms/{rid}/observe").json()
    assert obs.get("ok") is True
    # next_due returned via list
    listed = auth.get(f"{BASE_URL}/api/rhythms").json()["rhythms"]
    me = next(x for x in listed if x["rhythm_id"] == rid)
    # Compute expected with dateutil
    from dateutil.relativedelta import relativedelta
    expected = (date.fromisoformat(today) + relativedelta(months=1)).isoformat()
    assert me["next_due"] == expected, me


# --- Sacred Heart anniversary via relativedelta ----------------------------

def test_public_sacred_heart_anniversary(auth):
    # Enthrone on Feb 29 2024 (leap)
    auth.post(f"{BASE_URL}/api/sacred-heart/enthrone",
              json={"enthroned_at": "2024-02-29"})
    state = auth.get(f"{BASE_URL}/api/sacred-heart/state").json()
    assert state["enthroned_at"] == "2024-02-29"
    nr = state["next_renewal"]
    # Must be Feb 28 or Feb 29 (clamped); never a 500.
    assert nr.endswith("-02-28") or nr.endswith("-02-29"), nr
    # Must be a valid date >= today
    nr_date = date.fromisoformat(nr)
    assert nr_date >= date.today()


# --- Liturgical 1962 Sundays-after-Epiphany resumption ---------------------

def test_public_resumed_epiphany_sundays_2026():
    def get(d):
        return requests.get(
            f"{BASE_URL}/api/liturgical/today",
            params={"d": d, "variant": "traditional"},
        ).json()

    jan18 = get("2026-01-18")
    assert "II Sunday after Epiphany" in jan18["name"], jan18

    oct25 = get("2026-10-25")
    assert "XXII Sunday after Pentecost" in oct25["name"], oct25

    nov1 = get("2026-11-01")
    assert "IV Sunday after Epiphany (resumed)" in nov1["season_label"], nov1

    nov8 = get("2026-11-08")
    assert "V Sunday after Epiphany (resumed)" in nov8["name"], nov8

    nov15 = get("2026-11-15")
    assert "VI Sunday after Epiphany (resumed)" in nov15["name"], nov15

    nov22 = get("2026-11-22")
    assert "Last Sunday after Pentecost" in nov22["season_label"], nov22
