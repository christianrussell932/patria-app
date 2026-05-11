"""Patria v0.3 — Backend tests for Council, Sacred Heart, Rhythms and Liturgical naming.

Uses the demo session for read assertions and the conftest seeded_session +
a bootstrapped household for CRUD tests.
"""
import os
import time
import requests
import pytest
from datetime import date, datetime, timezone, timedelta

BASE = os.environ.get(
    "REACT_APP_BACKEND_URL",
    "https://emergent-blueprint-2.preview.emergentagent.com",
).rstrip("/")
API = f"{BASE}/api"

DEMO_SESSION = "demo_session_patria"

state = {}


# ----- demo client -----
@pytest.fixture(scope="module")
def demo_client():
    s = requests.Session()
    s.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {DEMO_SESSION}",
    })
    return s


# ----- isolated household for CRUD -----
@pytest.fixture(scope="module")
def crud_client(mongo_db):
    ts = int(time.time() * 1000)
    user_id = f"test-user-v3-{ts}"
    token = f"test_session_v3_{ts}"
    now = datetime.now(timezone.utc)
    mongo_db.users.insert_one({
        "user_id": user_id,
        "email": f"v3.{ts}@example.com",
        "name": "Patria v3 Pytest",
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
    r = s.post(f"{API}/household", json={
        "name": "TEST_v3 HH",
        "patron_saint": "St. Joseph",
        "calendar_variant": "traditional",
        "parent_name": "v3 Tester",
        "parent_color": "violet",
    })
    assert r.status_code == 200, r.text
    state["hid"] = r.json()["household_id"]
    state["uid"] = user_id
    me = s.get(f"{API}/household/me").json()
    state["primary_member_id"] = me["members"][0]["member_id"]

    yield s

    mongo_db.user_sessions.delete_many({"user_id": user_id})
    mongo_db.users.delete_many({"user_id": user_id})
    for col in ["households", "members", "meetings", "rhythms",
                "tasks", "events", "family_goals", "rules",
                "rule_checkins", "prayer_logs", "budget_categories",
                "budget_transactions"]:
        mongo_db[col].delete_many({"household_id": state["hid"]})


# ============================================================
# Council
# ============================================================
class TestCouncilAgenda:
    def test_agenda_shape(self, demo_client):
        r = demo_client.get(f"{API}/council/agenda")
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ("week_start", "last_week", "tasks",
                  "budget_overages", "goals",
                  "upcoming_events", "liturgical_reminders"):
            assert k in d, f"missing key {k}"
        for k in ("prayer_count", "rule_checkins", "tasks_completed"):
            assert k in d["last_week"]
        for k in ("overdue", "open_count", "open"):
            assert k in d["tasks"]
        assert isinstance(d["upcoming_events"], list)
        assert isinstance(d["liturgical_reminders"], list)


class TestCouncilMeetingFlow:
    def test_create_draft_meeting(self, crud_client):
        r = crud_client.post(f"{API}/council/meeting", json={})
        assert r.status_code == 200, r.text
        state["meeting_id"] = r.json()["meeting_id"]
        assert state["meeting_id"].startswith("mtg_")

    def test_get_meeting_has_snapshot(self, crud_client):
        r = crud_client.get(f"{API}/council/meeting/{state['meeting_id']}")
        assert r.status_code == 200
        m = r.json()
        assert m["status"] == "draft"
        assert "agenda_snapshot" in m
        assert "tasks" in m["agenda_snapshot"]

    def test_patch_meeting(self, crud_client):
        payload = {
            "notes": "TEST_Discussed budget",
            "decisions": "TEST_Cut subscriptions",
            "priorities": ["Pay tuition", "Plan retreat"],
            "assignments": [
                {"member_id": state["primary_member_id"],
                 "title": "TEST_Cancel Netflix",
                 "due_date": "2026-03-01"},
                {"member_id": state["primary_member_id"],
                 "title": "TEST_Book confession",
                 "due_date": "2026-03-05"},
            ],
        }
        r = crud_client.patch(f"{API}/council/meeting/{state['meeting_id']}", json=payload)
        assert r.status_code == 200
        m = crud_client.get(f"{API}/council/meeting/{state['meeting_id']}").json()
        assert m["notes"] == "TEST_Discussed budget"
        assert m["decisions"] == "TEST_Cut subscriptions"
        assert m["priorities"] == ["Pay tuition", "Plan retreat"]
        assert len(m["assignments"]) == 2

    def test_list_meetings_newest_first(self, crud_client):
        r = crud_client.get(f"{API}/council/meetings")
        assert r.status_code == 200
        mts = r.json()["meetings"]
        assert any(m["meeting_id"] == state["meeting_id"] for m in mts)
        # newest first by week_start
        wks = [m["week_start"] for m in mts]
        assert wks == sorted(wks, reverse=True)

    def test_finalize_creates_tasks(self, crud_client):
        before = crud_client.get(f"{API}/tasks", params={"include_completed": "true"}).json()["tasks"]
        before_ids = {t["task_id"] for t in before}
        r = crud_client.post(f"{API}/council/meeting/{state['meeting_id']}/finalize")
        assert r.status_code == 200
        after = crud_client.get(f"{API}/tasks", params={"include_completed": "true"}).json()["tasks"]
        new_tasks = [t for t in after if t["task_id"] not in before_ids]
        # 2 new tasks with category 'council'
        assert len([t for t in new_tasks if t.get("category") == "council"]) == 2
        m = crud_client.get(f"{API}/council/meeting/{state['meeting_id']}").json()
        assert m["status"] == "held"
        assert m["finalized_at"]

    def test_delete_meeting(self, crud_client):
        r = crud_client.delete(f"{API}/council/meeting/{state['meeting_id']}")
        assert r.status_code == 200
        r2 = crud_client.get(f"{API}/council/meeting/{state['meeting_id']}")
        assert r2.status_code == 404


# ============================================================
# Sacred Heart
# ============================================================
class TestSacredHeart:
    def test_state_initial(self, crud_client):
        r = crud_client.get(f"{API}/sacred-heart/state")
        assert r.status_code == 200
        d = r.json()
        for k in ("enthroned_at", "renewal_at", "notes", "next_renewal", "is_enthroned"):
            assert k in d
        assert d["is_enthroned"] is False

    def test_enthrone_persists(self, crud_client):
        r = crud_client.post(f"{API}/sacred-heart/enthrone", json={
            "enthroned_at": "2026-02-14", "notes": "TEST_Feast of love"
        })
        assert r.status_code == 200
        d = crud_client.get(f"{API}/sacred-heart/state").json()
        assert d["is_enthroned"] is True
        assert d["enthroned_at"] == "2026-02-14"
        assert d["next_renewal"] == "2027-02-14"

    def test_renew(self, crud_client):
        r = crud_client.post(f"{API}/sacred-heart/renew")
        assert r.status_code == 200
        d = crud_client.get(f"{API}/sacred-heart/state").json()
        assert d["renewal_at"] == date.today().isoformat()
        # next_renewal recomputed from renewal_at
        nd = date.today()
        assert d["next_renewal"] == date(nd.year + 1, nd.month, nd.day).isoformat()


# ============================================================
# Rhythms
# ============================================================
class TestRhythms:
    def test_invalid_cadence_400(self, crud_client):
        r = crud_client.post(f"{API}/rhythms", json={"name": "Bad", "cadence": "bogus"})
        assert r.status_code == 400

    def test_create_rhythm(self, crud_client):
        r = crud_client.post(f"{API}/rhythms", json={
            "name": "TEST_Confession", "cadence": "monthly"
        })
        assert r.status_code == 200, r.text
        state["rhy_id"] = r.json()["rhythm_id"]
        assert state["rhy_id"].startswith("rhy_")

    def test_list_no_next_due_when_unobserved(self, crud_client):
        rhys = crud_client.get(f"{API}/rhythms").json()["rhythms"]
        r = next(x for x in rhys if x["rhythm_id"] == state["rhy_id"])
        assert r["next_due"] is None

    def test_observe_sets_last_observed_and_next_due(self, crud_client):
        r = crud_client.post(f"{API}/rhythms/{state['rhy_id']}/observe")
        assert r.status_code == 200
        rhys = crud_client.get(f"{API}/rhythms").json()["rhythms"]
        r2 = next(x for x in rhys if x["rhythm_id"] == state["rhy_id"])
        assert r2["last_observed"] == date.today().isoformat()
        # monthly = +30 days
        expected = (date.today() + timedelta(days=30)).isoformat()
        assert r2["next_due"] == expected

    def test_patch_rhythm(self, crud_client):
        r = crud_client.patch(f"{API}/rhythms/{state['rhy_id']}",
                              json={"cadence": "weekly", "notes": "TEST_note"})
        assert r.status_code == 200
        rhys = crud_client.get(f"{API}/rhythms").json()["rhythms"]
        r2 = next(x for x in rhys if x["rhythm_id"] == state["rhy_id"])
        assert r2["cadence"] == "weekly"
        assert r2["notes"] == "TEST_note"

    def test_delete_rhythm(self, crud_client):
        r = crud_client.delete(f"{API}/rhythms/{state['rhy_id']}")
        assert r.status_code == 200
        rhys = crud_client.get(f"{API}/rhythms").json()["rhythms"]
        assert all(x["rhythm_id"] != state["rhy_id"] for x in rhys)


# ============================================================
# Liturgical — naming and variants
# ============================================================
class TestLiturgical:
    def test_today_default_roman(self, demo_client):
        r = demo_client.get(f"{API}/liturgical/today")
        assert r.status_code == 200
        d = r.json()
        for k in ("date", "name", "color", "rank", "season"):
            assert k in d
        # No generic 'Feria' name on ferial days
        assert d["name"] != "Feria"

    def test_christmas_solemnity_roman(self, demo_client):
        r = demo_client.get(f"{API}/liturgical/today", params={"d": "2026-12-25"})
        d = r.json()
        assert d["rank"] == "solemnity"
        assert "Nativity" in d["name"] or "Christmas" in d["name"]

    def test_christmas_solemnity_traditional(self, demo_client):
        r = demo_client.get(f"{API}/liturgical/today",
                            params={"d": "2026-12-25", "variant": "traditional"})
        d = r.json()
        assert d["rank"] == "solemnity"
        assert "Nativity" in d["name"] or "Christmas" in d["name"]

    def test_ash_wednesday_2026(self, demo_client):
        r = demo_client.get(f"{API}/liturgical/today", params={"d": "2026-02-18"})
        d = r.json()
        assert "Ash Wednesday" in d["name"]
        assert d.get("fasting") is True
        assert d.get("abstinence") is True

    def test_ferial_naming_roman_jan_20_2026(self, demo_client):
        # 2026-01-20 is a Tuesday during Ordinary Time
        r = demo_client.get(f"{API}/liturgical/today", params={"d": "2026-01-20"})
        d = r.json()
        # New ferial naming should include weekday + week + 'Ordinary Time'
        assert d["name"] != "Feria"
        n = d["name"]
        # Either format: "Tuesday — II Week in Ordinary Time" etc.
        assert "Tuesday" in n
        assert "Ordinary Time" in n

    def test_traditional_after_epiphany_ferial(self, demo_client):
        # 2026-01-20 (Tue) — Traditional: "Tuesday after II Sunday after Epiphany"
        r = demo_client.get(f"{API}/liturgical/today",
                            params={"d": "2026-01-20", "variant": "traditional"})
        d = r.json()
        assert d["name"] != "Feria"
        assert "Epiphany" in d["name"] or "after" in d["name"].lower()

    def test_septuagesima_traditional_only(self, demo_client):
        # Ash Wed 2026 = 2026-02-18 → Septuagesima ~ 17 days before = ~2026-02-01
        r_trad = demo_client.get(f"{API}/liturgical/today",
                                 params={"d": "2026-02-01", "variant": "traditional"})
        d_trad = r_trad.json()
        # Should be Septuagesima season (or Septuagesima Sunday)
        assert ("Septuagesima" in d_trad.get("season", "") or
                "Septuagesima" in d_trad.get("name", "")), \
            f"expected Septuagesima for traditional 2026-02-01, got {d_trad}"

        # Roman variant on same date should be Ordinary Time (no Septuagesima)
        r_roman = demo_client.get(f"{API}/liturgical/today", params={"d": "2026-02-01"})
        d_roman = r_roman.json()
        assert "Septuagesima" not in d_roman.get("season", "")

    def test_calendar_endpoint_with_variant(self, demo_client):
        r = demo_client.get(f"{API}/liturgical/calendar",
                            params={"year": 2026, "month": 2, "variant": "traditional"})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["variant"] == "traditional"
        assert isinstance(d["days"], list)
        # Some day in early Feb should mention Septuagesima season
        feb_first = next((x for x in d["days"] if x.get("date") == "2026-02-01"), None)
        assert feb_first is not None
        assert "Septuagesima" in (feb_first.get("season", "") or feb_first.get("name", ""))


# ============================================================
# Dashboard uses household's calendar_variant
# ============================================================
class TestDashboardCalendarVariant:
    def test_traditional_household_dashboard_uses_traditional(self, crud_client):
        # crud_client household was created with calendar_variant=traditional
        d = crud_client.get(f"{API}/dashboard").json()
        # liturgical is present and reflects today; in traditional variant
        # ferial names shouldn't be generic 'Feria'
        assert "liturgical" in d
        assert d["liturgical"]["name"] != "Feria"
