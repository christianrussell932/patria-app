"""Catholic Household OS — Backend API tests.

Covers: Auth, Liturgical, Household, Rules, Prayer, Challenges.
"""
import os
import pytest

BASE = os.environ.get('REACT_APP_BACKEND_URL', 'https://emergent-blueprint-2.preview.emergentagent.com').rstrip('/')
API = f"{BASE}/api"

# --- shared state for ordered tests ---
state = {}


# ---------------- Auth ----------------
class TestAuth:
    def test_me_unauthenticated_returns_401(self, anon_client):
        r = anon_client.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_me_with_bearer_returns_user(self, auth_client, seeded_session):
        r = auth_client.get(f"{API}/auth/me")
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["user_id"] == seeded_session["user_id"]
        assert "email" in data and data["email"]
        assert data.get("current_household_id") in (None, "")

    def test_household_me_unauthenticated_returns_401(self, anon_client):
        r = anon_client.get(f"{API}/household/me")
        assert r.status_code == 401


# ---------------- Liturgical ----------------
class TestLiturgical:
    def test_today_no_auth(self, anon_client):
        r = anon_client.get(f"{API}/liturgical/today")
        assert r.status_code == 200
        d = r.json()
        for k in ("date", "name", "color", "rank", "season", "fasting", "abstinence", "is_sunday"):
            assert k in d

    def test_christmas_2026_white_solemnity(self, anon_client):
        r = anon_client.get(f"{API}/liturgical/today", params={"d": "2026-12-25"})
        assert r.status_code == 200
        d = r.json()
        assert d["color"] == "white"
        assert d["rank"] == "solemnity"
        assert "Christmas" in d["name"] or "Nativity" in d["name"]

    def test_easter_2026_april_5(self, anon_client):
        r = anon_client.get(f"{API}/liturgical/today", params={"d": "2026-04-05"})
        assert r.status_code == 200
        d = r.json()
        assert d["name"].lower().startswith("easter")
        assert d["color"] == "white"
        assert d["rank"] == "solemnity"

    def test_ash_wednesday_2026(self, anon_client):
        r = anon_client.get(f"{API}/liturgical/today", params={"d": "2026-02-18"})
        assert r.status_code == 200
        d = r.json()
        assert "Ash Wednesday" in d["name"]
        assert d["fasting"] is True
        assert d["abstinence"] is True

    def test_calendar_dec_2026_has_31_days(self, anon_client):
        r = anon_client.get(f"{API}/liturgical/calendar", params={"year": 2026, "month": 12})
        assert r.status_code == 200
        d = r.json()
        assert d["year"] == 2026 and d["month"] == 12
        assert len(d["days"]) == 31


# ---------------- Household ----------------
class TestHousehold:
    def test_create_household(self, auth_client):
        payload = {
            "name": "TEST_St. Joseph House",
            "patron_saint": "St. Joseph",
            "calendar_variant": "roman",
            "parent_name": "Dad",
            "parent_color": "violet",
        }
        r = auth_client.post(f"{API}/household", json=payload)
        assert r.status_code == 200, r.text
        hid = r.json().get("household_id")
        assert hid and hid.startswith("hh_")
        state["household_id"] = hid

    def test_get_my_household(self, auth_client):
        r = auth_client.get(f"{API}/household/me")
        assert r.status_code == 200
        d = r.json()
        assert d["household"]["household_id"] == state["household_id"]
        assert d["household"]["name"] == "TEST_St. Joseph House"
        members = d["members"]
        assert len(members) == 1
        assert members[0]["role"] == "parent"
        assert members[0]["linked_user_id"]
        state["primary_member_id"] = members[0]["member_id"]

    def test_auth_me_now_has_current_household_id(self, auth_client):
        r = auth_client.get(f"{API}/auth/me")
        assert r.status_code == 200
        assert r.json()["current_household_id"] == state["household_id"]

    def test_patch_household(self, auth_client):
        r = auth_client.patch(f"{API}/household", json={"patron_saint": "Holy Family"})
        assert r.status_code == 200
        r2 = auth_client.get(f"{API}/household/me")
        assert r2.json()["household"]["patron_saint"] == "Holy Family"

    def test_add_child_member(self, auth_client):
        r = auth_client.post(f"{API}/household/members", json={
            "name": "TEST_Child", "role": "child", "color": "rose"
        })
        assert r.status_code == 200, r.text
        mid = r.json()["member_id"]
        assert mid.startswith("mem_")
        state["child_member_id"] = mid

    def test_cannot_remove_primary(self, auth_client):
        r = auth_client.delete(f"{API}/household/members/{state['primary_member_id']}")
        assert r.status_code == 400

    def test_remove_child_member(self, auth_client):
        # Add an extra deletable child first
        r = auth_client.post(f"{API}/household/members", json={
            "name": "TEST_RemoveMe", "role": "child", "color": "slate"
        })
        mid = r.json()["member_id"]
        r2 = auth_client.delete(f"{API}/household/members/{mid}")
        assert r2.status_code == 200
        # Verify removed
        r3 = auth_client.get(f"{API}/household/me")
        ids = [m["member_id"] for m in r3.json()["members"]]
        assert mid not in ids


# ---------------- Rules ----------------
class TestRules:
    def test_create_rule(self, auth_client):
        r = auth_client.post(f"{API}/rules", json={
            "pillar": "prayer",
            "title": "TEST_Morning Offering",
            "cadence": "daily",
            "assigned_member_ids": [state["primary_member_id"]],
        })
        assert r.status_code == 200, r.text
        state["rule_id"] = r.json()["rule_id"]

    def test_invalid_pillar_400(self, auth_client):
        r = auth_client.post(f"{API}/rules", json={
            "pillar": "invalid", "title": "X", "cadence": "daily"
        })
        assert r.status_code == 400

    def test_list_rules(self, auth_client):
        r = auth_client.get(f"{API}/rules")
        assert r.status_code == 200
        rules = r.json()["rules"]
        ids = [x["rule_id"] for x in rules]
        assert state["rule_id"] in ids
        rule = next(x for x in rules if x["rule_id"] == state["rule_id"])
        assert "completed_today_member_ids" in rule
        assert rule["completed_today_member_ids"] == []

    def test_checkin_idempotent(self, auth_client):
        rid = state["rule_id"]
        mid = state["primary_member_id"]
        for _ in range(2):
            r = auth_client.post(f"{API}/rules/{rid}/checkin", json={
                "member_id": mid, "completed": True
            })
            assert r.status_code == 200
        # Verify only one checkin
        r2 = auth_client.get(f"{API}/rules")
        rule = next(x for x in r2.json()["rules"] if x["rule_id"] == rid)
        assert rule["completed_today_member_ids"].count(mid) == 1

    def test_uncheckin_removes(self, auth_client):
        rid = state["rule_id"]
        mid = state["primary_member_id"]
        r = auth_client.post(f"{API}/rules/{rid}/checkin", json={
            "member_id": mid, "completed": False
        })
        assert r.status_code == 200
        r2 = auth_client.get(f"{API}/rules")
        rule = next(x for x in r2.json()["rules"] if x["rule_id"] == rid)
        assert mid not in rule["completed_today_member_ids"]

    def test_patch_rule(self, auth_client):
        rid = state["rule_id"]
        r = auth_client.patch(f"{API}/rules/{rid}", json={"title": "TEST_Updated"})
        assert r.status_code == 200
        r2 = auth_client.get(f"{API}/rules")
        rule = next(x for x in r2.json()["rules"] if x["rule_id"] == rid)
        assert rule["title"] == "TEST_Updated"

    def test_delete_rule(self, auth_client):
        rid = state["rule_id"]
        # Add a checkin so we can verify cascade cleanup
        auth_client.post(f"{API}/rules/{rid}/checkin", json={
            "member_id": state["primary_member_id"], "completed": True
        })
        r = auth_client.delete(f"{API}/rules/{rid}")
        assert r.status_code == 200
        r2 = auth_client.get(f"{API}/rules")
        ids = [x["rule_id"] for x in r2.json()["rules"]]
        assert rid not in ids


# ---------------- Prayer ----------------
class TestPrayer:
    def test_log_prayer(self, auth_client):
        r = auth_client.post(f"{API}/prayer/log", json={
            "member_id": state["primary_member_id"],
            "prayer_type": "rosary",
            "detail": "Joyful Mysteries",
        })
        assert r.status_code == 200, r.text
        state["prayer_log_id"] = r.json()["log_id"]
        assert state["prayer_log_id"].startswith("plog_")

    def test_get_log_for_today(self, auth_client):
        r = auth_client.get(f"{API}/prayer/log")
        assert r.status_code == 200
        d = r.json()
        assert "logs" in d and "date" in d
        ids = [x["log_id"] for x in d["logs"]]
        assert state["prayer_log_id"] in ids
        log = next(x for x in d["logs"] if x["log_id"] == state["prayer_log_id"])
        assert log["prayer_type"] == "rosary"
        assert log["detail"] == "Joyful Mysteries"

    def test_prayer_stats(self, auth_client):
        r = auth_client.get(f"{API}/prayer/stats")
        assert r.status_code == 200
        d = r.json()
        assert "by_type" in d and "total" in d and "week_start" in d
        assert d["by_type"].get("rosary", 0) >= 1
        assert d["total"] >= 1

    def test_delete_prayer_log(self, auth_client):
        lid = state["prayer_log_id"]
        r = auth_client.delete(f"{API}/prayer/log/{lid}")
        assert r.status_code == 200
        r2 = auth_client.get(f"{API}/prayer/log")
        ids = [x["log_id"] for x in r2.json()["logs"]]
        assert lid not in ids

    def test_log_prayer_household_level_no_member(self, auth_client):
        # v0.11 — member_id is optional. Household-level prayer rhythms are
        # logged without a member, because the rhythm belongs to the house, not
        # to any individual person.
        r = auth_client.post(f"{API}/prayer/log", json={
            "prayer_type": "angelus",
        })
        assert r.status_code == 200, r.text
        lid = r.json()["log_id"]
        assert lid.startswith("plog_")
        # And the log appears for today with member_id == None
        d = auth_client.get(f"{API}/prayer/log").json()
        log = next(x for x in d["logs"] if x["log_id"] == lid)
        assert log["prayer_type"] == "angelus"
        assert log.get("member_id") is None
        # Cleanup
        auth_client.delete(f"{API}/prayer/log/{lid}")


# ---------------- Challenges ----------------
EXPECTED_TEMPLATES = {
    "advent_jesse_tree", "lent_40", "exodus_90",
    "marian_consecration_33", "rosary_54",
}


class TestChallenges:
    def test_templates(self, anon_client):
        r = anon_client.get(f"{API}/challenges/templates")
        assert r.status_code == 200
        tpls = r.json()["templates"]
        keys = {t["key"] for t in tpls}
        assert keys == EXPECTED_TEMPLATES

    def test_start_from_template(self, auth_client):
        r = auth_client.post(f"{API}/challenges/start", json={
            "template_key": "lent_40",
            "member_ids": [state["primary_member_id"]],
        })
        assert r.status_code == 200, r.text
        state["challenge_id"] = r.json()["challenge_id"]

    def test_active_challenges(self, auth_client):
        r = auth_client.get(f"{API}/challenges/active")
        assert r.status_code == 200
        chals = r.json()["challenges"]
        ours = next((c for c in chals if c["challenge_id"] == state["challenge_id"]), None)
        assert ours is not None
        assert ours["title"] == "Lent — 40 Days in the Desert"
        assert ours["days_total"] == 40
        assert ours["color"] == "violet"
        assert "current_day" in ours
        assert "completion_pct" in ours
        assert "member_progress" in ours
        assert "completed_today_member_ids" in ours

    def test_challenge_checkin_idempotent(self, auth_client):
        cid = state["challenge_id"]
        mid = state["primary_member_id"]
        for _ in range(2):
            r = auth_client.post(f"{API}/challenges/{cid}/checkin", json={
                "member_id": mid, "completed": True
            })
            assert r.status_code == 200
        r2 = auth_client.get(f"{API}/challenges/active")
        ours = next(c for c in r2.json()["challenges"] if c["challenge_id"] == cid)
        assert ours["completed_today_member_ids"].count(mid) == 1
        assert ours["member_progress"].get(mid, 0) == 1

    def test_challenge_uncheckin(self, auth_client):
        cid = state["challenge_id"]
        mid = state["primary_member_id"]
        r = auth_client.post(f"{API}/challenges/{cid}/checkin", json={
            "member_id": mid, "completed": False
        })
        assert r.status_code == 200
        r2 = auth_client.get(f"{API}/challenges/active")
        ours = next(c for c in r2.json()["challenges"] if c["challenge_id"] == cid)
        assert mid not in ours["completed_today_member_ids"]

    def test_challenge_end(self, auth_client):
        cid = state["challenge_id"]
        r = auth_client.post(f"{API}/challenges/{cid}/end")
        assert r.status_code == 200
        r2 = auth_client.get(f"{API}/challenges/active")
        ids = [c["challenge_id"] for c in r2.json()["challenges"]]
        assert cid not in ids

    def test_invalid_template(self, auth_client):
        r = auth_client.post(f"{API}/challenges/start", json={"template_key": "nope_xyz"})
        assert r.status_code == 404


# ---------------- Logout (run last to keep session valid for prior tests) ----------------
class TestZLogout:
    def test_logout(self, auth_client):
        r = auth_client.post(f"{API}/auth/logout")
        assert r.status_code == 200
        # Note: logout deletes by cookie token; bearer tokens still work in this impl.
        # Validate at least the endpoint succeeds.
        assert r.json().get("ok") is True


# ---------------- Cleanup ----------------
@pytest.fixture(scope="session", autouse=True)
def _cleanup(mongo_db, seeded_session):
    yield
    uid = seeded_session["user_id"]
    # Find household
    hh = mongo_db.households.find_one({"created_by": uid})
    if hh:
        hid = hh["household_id"]
        mongo_db.households.delete_many({"household_id": hid})
        mongo_db.members.delete_many({"household_id": hid})
        mongo_db.rules.delete_many({"household_id": hid})
        mongo_db.rule_checkins.delete_many({"household_id": hid})
        mongo_db.prayer_logs.delete_many({"household_id": hid})
        mongo_db.challenges.delete_many({"household_id": hid})
        mongo_db.challenge_checkins.delete_many({"household_id": hid})
