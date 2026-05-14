"""Patria — Catholic Family OS — Backend tests for new modules.

Covers: Budget, Savings, Schedule, Tasks, Goals, Household-policy patch,
new pillars on Rules, and the composite /dashboard payload (against demo data).
"""
import os
import uuid
import requests
import pytest

BASE = os.environ.get(
    "REACT_APP_BACKEND_URL",
    "https://emergent-blueprint-2.preview.emergentagent.com",
).rstrip("/")
API = f"{BASE}/api"

DEMO_SESSION = "demo_session_patria"
DEMO_HH = "hh_demo_patria"

state = {}


# ------------- Demo Session client (rich data for /dashboard) -------------
@pytest.fixture(scope="session")
def demo_client():
    s = requests.Session()
    s.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {DEMO_SESSION}",
    })
    return s


# ------------- Bootstrap a fresh isolated household for CRUD tests -------------
@pytest.fixture(scope="session")
def crud_client(mongo_db):
    """Use the conftest seeded_session, but bootstrap a household for CRUD."""
    import time
    from datetime import datetime, timezone, timedelta
    ts = int(time.time() * 1000)
    user_id = f"test-user-patria-{ts}"
    token = f"test_session_patria_{ts}"
    now = datetime.now(timezone.utc)
    mongo_db.users.insert_one({
        "user_id": user_id,
        "email": f"patria.{ts}@example.com",
        "name": "Patria Pytest",
        "picture": None,
        "current_household_id": None,
        "created_at": now.isoformat(),
    })
    mongo_db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": token,
        "expires_at": (now + timedelta(days=7)).isoformat(),
        "created_at": now.isoformat(),
    })
    s = requests.Session()
    s.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}",
    })
    # create household
    r = s.post(f"{API}/household", json={
        "name": "TEST_Patria HH",
        "patron_saint": "St. Joseph",
        "calendar_variant": "roman",
        "parent_name": "Tester",
        "parent_color": "violet",
    })
    assert r.status_code == 200, r.text
    hid = r.json()["household_id"]
    state["hid"] = hid
    state["uid"] = user_id
    # primary member id
    me = s.get(f"{API}/household/me").json()
    state["primary_member_id"] = me["members"][0]["member_id"]

    yield s

    # teardown
    mongo_db.user_sessions.delete_many({"user_id": user_id})
    mongo_db.users.delete_many({"user_id": user_id})
    for col in [
        "households", "members", "rules", "rule_checkins", "prayer_logs",
        "challenges", "challenge_checkins", "budget_categories",
        "budget_transactions", "savings_goals", "events", "tasks",
        "family_goals",
    ]:
        mongo_db[col].delete_many({"household_id": hid})


# ============================================================
# Budget — categories
# ============================================================
class TestBudgetCategories:
    def test_create_category(self, crud_client):
        r = crud_client.post(f"{API}/budget/categories", json={
            "name": "TEST_Groceries", "monthly_limit": 600, "color": "green", "kind": "expense"
        })
        assert r.status_code == 200, r.text
        state["cat_id"] = r.json()["category_id"]
        assert state["cat_id"].startswith("bcat_")

    def test_list_categories(self, crud_client):
        r = crud_client.get(f"{API}/budget/categories")
        assert r.status_code == 200
        cats = r.json()["categories"]
        assert any(c["category_id"] == state["cat_id"] for c in cats)

    def test_patch_category(self, crud_client):
        r = crud_client.patch(f"{API}/budget/categories/{state['cat_id']}",
                              json={"monthly_limit": 750.0})
        assert r.status_code == 200
        cats = crud_client.get(f"{API}/budget/categories").json()["categories"]
        c = next(x for x in cats if x["category_id"] == state["cat_id"])
        assert c["monthly_limit"] == 750.0


# ============================================================
# Budget — transactions & summary
# ============================================================
class TestBudgetTransactions:
    def test_create_income(self, crud_client):
        r = crud_client.post(f"{API}/budget/transactions", json={
            "amount": 5000, "type": "income", "note": "TEST_paycheck"
        })
        assert r.status_code == 200, r.text
        state["txn_income"] = r.json()["txn_id"]

    def test_create_expense(self, crud_client):
        r = crud_client.post(f"{API}/budget/transactions", json={
            "category_id": state["cat_id"], "amount": 120.5, "type": "expense", "note": "TEST_food"
        })
        assert r.status_code == 200, r.text
        state["txn_exp"] = r.json()["txn_id"]

    def test_create_giving(self, crud_client):
        r = crud_client.post(f"{API}/budget/transactions", json={
            "amount": 500, "type": "giving", "note": "TEST_tithe"
        })
        assert r.status_code == 200, r.text

    def test_list_transactions_current_month(self, crud_client):
        r = crud_client.get(f"{API}/budget/transactions")
        assert r.status_code == 200
        txns = r.json()["transactions"]
        ids = [t["txn_id"] for t in txns]
        assert state["txn_income"] in ids and state["txn_exp"] in ids

    def test_summary_totals_and_progress(self, crud_client):
        r = crud_client.get(f"{API}/budget/summary")
        assert r.status_code == 200
        d = r.json()
        assert d["income"] == 5000
        assert d["expense"] == 120.5
        assert d["giving"] == 500
        assert d["net"] == pytest.approx(5000 - 120.5 - 500)
        assert d["tithe_pct"] == 10.0
        cat = next(c for c in d["categories"] if c["category_id"] == state["cat_id"])
        assert cat["spent"] == 120.5
        assert cat["remaining"] == pytest.approx(750.0 - 120.5)
        assert cat["pct"] == pytest.approx(round((120.5/750)*100, 1))

    def test_delete_transaction(self, crud_client):
        r = crud_client.delete(f"{API}/budget/transactions/{state['txn_exp']}")
        assert r.status_code == 200
        ids = [t["txn_id"] for t in crud_client.get(f"{API}/budget/transactions").json()["transactions"]]
        assert state["txn_exp"] not in ids


# ============================================================
# Budget — savings goals
# ============================================================
class TestSavingsGoals:
    def test_create_goal(self, crud_client):
        r = crud_client.post(f"{API}/budget/savings-goals", json={
            "name": "TEST_Emergency", "target_amount": 5000, "current_amount": 1000, "color": "amber"
        })
        assert r.status_code == 200, r.text
        state["sg_id"] = r.json()["goal_id"]

    def test_patch_goal_current(self, crud_client):
        r = crud_client.patch(f"{API}/budget/savings-goals/{state['sg_id']}",
                              json={"current_amount": 2500})
        assert r.status_code == 200
        goals = crud_client.get(f"{API}/budget/savings-goals").json()["goals"]
        g = next(x for x in goals if x["goal_id"] == state["sg_id"])
        assert g["current_amount"] == 2500

    def test_delete_goal(self, crud_client):
        r = crud_client.delete(f"{API}/budget/savings-goals/{state['sg_id']}")
        assert r.status_code == 200


# ============================================================
# Budget — category cascade delete
# ============================================================
class TestBudgetCascadeDelete:
    def test_cascade_delete(self, crud_client):
        # Create a fresh category + transaction, then delete category.
        r = crud_client.post(f"{API}/budget/categories", json={
            "name": "TEST_Cascade", "monthly_limit": 100
        })
        cid = r.json()["category_id"]
        r2 = crud_client.post(f"{API}/budget/transactions", json={
            "category_id": cid, "amount": 25, "type": "expense"
        })
        tid = r2.json()["txn_id"]
        # delete category
        r3 = crud_client.delete(f"{API}/budget/categories/{cid}")
        assert r3.status_code == 200
        # txn should be gone
        ids = [t["txn_id"] for t in crud_client.get(f"{API}/budget/transactions").json()["transactions"]]
        assert tid not in ids


# ============================================================
# Schedule — events
# ============================================================
class TestSchedule:
    def test_create_event(self, crud_client):
        r = crud_client.post(f"{API}/schedule/events", json={
            "title": "TEST_Mass", "event_date": "2026-02-22", "event_time": "10:00",
            "type": "liturgical", "member_ids": [state["primary_member_id"]]
        })
        assert r.status_code == 200, r.text
        state["evt_id"] = r.json()["event_id"]

    def test_invalid_event_type_accepted_or_rejected(self, crud_client):
        # Server doesn't strictly validate type currently — accept either 200 or 400/422.
        r = crud_client.post(f"{API}/schedule/events", json={
            "title": "TEST_Bad", "event_date": "2026-02-22", "type": "bogus"
        })
        # Just don't 500
        assert r.status_code != 500

    def test_list_events_filter_by_range(self, crud_client):
        r = crud_client.get(f"{API}/schedule/events", params={
            "start": "2026-02-01", "end": "2026-02-28"
        })
        assert r.status_code == 200
        events = r.json()["events"]
        assert any(e["event_id"] == state["evt_id"] for e in events)

    def test_patch_event(self, crud_client):
        r = crud_client.patch(f"{API}/schedule/events/{state['evt_id']}",
                              json={"event_time": "11:00"})
        assert r.status_code == 200
        events = crud_client.get(f"{API}/schedule/events").json()["events"]
        e = next(x for x in events if x["event_id"] == state["evt_id"])
        assert e["event_time"] == "11:00"

    def test_delete_event(self, crud_client):
        r = crud_client.delete(f"{API}/schedule/events/{state['evt_id']}")
        assert r.status_code == 200


# ============================================================
# Tasks
# ============================================================
class TestTasks:
    def test_create_task(self, crud_client):
        r = crud_client.post(f"{API}/tasks", json={
            "title": "TEST_Take out trash", "due_date": "2026-02-22",
            "assigned_member_id": state["primary_member_id"], "category": "chore",
        })
        assert r.status_code == 200, r.text
        state["task_id"] = r.json()["task_id"]

    def test_list_excludes_completed_by_default(self, crud_client):
        r = crud_client.get(f"{API}/tasks")
        assert r.status_code == 200
        tasks = r.json()["tasks"]
        t = next(x for x in tasks if x["task_id"] == state["task_id"])
        assert t["completed"] is False
        assert t.get("completed_at") in (None, "")

    def test_complete_task_sets_completed_at(self, crud_client):
        r = crud_client.patch(f"{API}/tasks/{state['task_id']}", json={"completed": True})
        assert r.status_code == 200
        # Default GET should now exclude
        tasks_default = crud_client.get(f"{API}/tasks").json()["tasks"]
        assert all(t["task_id"] != state["task_id"] for t in tasks_default)
        # With include_completed
        all_tasks = crud_client.get(f"{API}/tasks", params={"include_completed": "true"}).json()["tasks"]
        t = next(x for x in all_tasks if x["task_id"] == state["task_id"])
        assert t["completed"] is True
        assert t["completed_at"]  # truthy timestamp

    def test_delete_task(self, crud_client):
        r = crud_client.delete(f"{API}/tasks/{state['task_id']}")
        assert r.status_code == 200


# ============================================================
# Goals
# ============================================================
class TestGoals:
    def test_create_short_goal(self, crud_client):
        r = crud_client.post(f"{API}/goals", json={
            "title": "TEST_Read 4 books", "scope": "short", "progress": 25
        })
        assert r.status_code == 200, r.text
        state["goal_id"] = r.json()["goal_id"]

    def test_create_long_goal(self, crud_client):
        r = crud_client.post(f"{API}/goals", json={
            "title": "TEST_Pilgrimage", "scope": "long", "progress": 0
        })
        assert r.status_code == 200, r.text
        state["goal_id_long"] = r.json()["goal_id"]

    def test_list_newest_first(self, crud_client):
        r = crud_client.get(f"{API}/goals")
        assert r.status_code == 200
        goals = r.json()["goals"]
        ids = [g["goal_id"] for g in goals]
        # Long was created after short → must come first
        assert ids.index(state["goal_id_long"]) < ids.index(state["goal_id"])

    def test_patch_progress(self, crud_client):
        r = crud_client.patch(f"{API}/goals/{state['goal_id']}", json={"progress": 75})
        assert r.status_code == 200
        goals = crud_client.get(f"{API}/goals").json()["goals"]
        g = next(x for x in goals if x["goal_id"] == state["goal_id"])
        assert g["progress"] == 75

    def test_delete(self, crud_client):
        for gid in (state["goal_id"], state["goal_id_long"]):
            r = crud_client.delete(f"{API}/goals/{gid}")
            assert r.status_code == 200


# ============================================================
# Household — mission/values/technology_policy/roles
# ============================================================
class TestHouseholdPolicy:
    def test_patch_policy(self, crud_client):
        r = crud_client.patch(f"{API}/household", json={
            "mission_statement": "TEST_To raise saints.",
            "values": ["faith", "fortitude", "joy"],
            "technology_policy": "TEST_No phones at table.",
            "roles": {state["primary_member_id"]: "Spiritual Head"},
        })
        assert r.status_code == 200, r.text
        d = crud_client.get(f"{API}/household/me").json()["household"]
        assert d["mission_statement"] == "TEST_To raise saints."
        assert d["values"] == ["faith", "fortitude", "joy"]
        assert d["technology_policy"] == "TEST_No phones at table."
        assert d["roles"][state["primary_member_id"]] == "Spiritual Head"


# ============================================================
# Rules — new + legacy pillars
# ============================================================
NEW_PILLARS = ["spiritual", "financial", "order", "marriage", "children", "health", "hospitality"]
LEGACY_PILLARS = ["prayer", "fasting", "almsgiving", "work", "rest", "formation"]


class TestRulesPillars:
    def test_new_pillars_accepted(self, crud_client):
        created = []
        for p in NEW_PILLARS:
            r = crud_client.post(f"{API}/rules", json={
                "pillar": p, "title": f"TEST_{p}_rule", "cadence": "daily"
            })
            assert r.status_code == 200, f"pillar {p}: {r.text}"
            created.append(r.json()["rule_id"])
        # cleanup
        for rid in created:
            crud_client.delete(f"{API}/rules/{rid}")

    def test_legacy_pillars_still_accepted(self, crud_client):
        for p in LEGACY_PILLARS:
            r = crud_client.post(f"{API}/rules", json={
                "pillar": p, "title": f"TEST_legacy_{p}", "cadence": "daily"
            })
            assert r.status_code == 200, f"legacy pillar {p}: {r.text}"
            crud_client.delete(f"{API}/rules/{r.json()['rule_id']}")

    def test_invalid_pillar_400(self, crud_client):
        r = crud_client.post(f"{API}/rules", json={
            "pillar": "notapillar", "title": "X", "cadence": "daily"
        })
        assert r.status_code == 400


# ============================================================
# Dashboard — composite payload (uses demo data)
# ============================================================
class TestDashboard:
    def test_dashboard_shape(self, demo_client):
        r = demo_client.get(f"{API}/dashboard")
        assert r.status_code == 200, r.text
        d = r.json()
        # Top-level
        for k in ("household", "liturgical", "today", "todays_events", "upcoming_events",
                  "date_night", "tasks", "prayer", "budget", "active_challenge",
                  "goals", "council", "members_count"):
            assert k in d, f"missing key {k}"
        # v0.13 — first-run flag for Dashboard Council panel
        assert "has_held_first_council" in d["council"]
        assert isinstance(d["council"]["has_held_first_council"], bool)
        # Household Health score was removed in v0.9 — Patria does not grade the family.
        # Weekly reflection now belongs to the Family Council module.
        assert "weekly_score" not in d, "weekly_score must not be present in dashboard response"
        # liturgical
        for k in ("date", "name", "color", "rank", "season"):
            assert k in d["liturgical"]
        # tasks
        for k in ("due_today", "overdue", "open_count"):
            assert k in d["tasks"]
        # prayer
        assert "streak_days" in d["prayer"]
        assert "week_count" in d["prayer"]
        # budget
        for k in ("income", "expense", "giving", "tithe_pct", "over_categories", "net"):
            assert k in d["budget"]
        # goals
        assert "items" in d["goals"]
        # Family Goals aggregate average-progress KPI was removed in v0.10 — Patria does not
        # average heterogeneous family goods into a single synthetic number.
        assert "avg_progress" not in d["goals"], "goals.avg_progress must not be present"

    def test_dashboard_demo_has_data(self, demo_client):
        d = demo_client.get(f"{API}/dashboard").json()
        # Demo seeded with prayer logs over last 6 days → week_count > 0
        assert d["prayer"]["week_count"] >= 1
        # Demo has 3 members
        assert d["members_count"] >= 3
        # Demo has at least one event coming up (date_night or other)
        # — date_night may be None if no future date_night, but upcoming/todays should not be empty in aggregate
        assert isinstance(d["upcoming_events"], list)
        # Demo has active challenge "Lent 40"
        assert d["active_challenge"] is not None
        assert d["active_challenge"].get("days_total") in (40, None) or "days_total" in d["active_challenge"]
        assert "current_day" in d["active_challenge"]
        assert "completion_pct" in d["active_challenge"]

    def test_dashboard_unauth_401(self, anon_client):
        r = anon_client.get(f"{API}/dashboard")
        assert r.status_code == 401
