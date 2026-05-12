"""Regression tests for v0.5 technical correctness fixes:
- Council finalize idempotency (dedupe by assignment_id OR title)
- Rhythm next_due using dateutil.relativedelta (monthly clamping, Feb 29)
- Sacred Heart anniversary using dateutil.relativedelta (Feb 29)
- Liturgical: Sundays after Epiphany (1962) — including displaced + resumed Sundays
"""
import os
import sys
import time
import pytest
import requests
from datetime import date

# Local imports for unit-level testing
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from routers.rhythms import _next_due  # noqa: E402
from routers.sacred_heart import _next_anniversary  # noqa: E402
from liturgical import liturgical_for, first_sunday_of_advent  # noqa: E402


# ---------------------------------------------------------------------------
# Pure / unit tests — no HTTP
# ---------------------------------------------------------------------------

def test_first_sunday_of_advent_is_a_sunday():
    for y in range(2020, 2031):
        adv = first_sunday_of_advent(y)
        assert adv.weekday() == 6, f"Advent 1 {y} is {adv.strftime('%A')}, expected Sunday"


def test_rhythm_next_due_feb29_yearly():
    # 2024 is leap; 2025 is not — yearly anniversary should clamp to Feb 28.
    assert _next_due("yearly", "2024-02-29") == "2025-02-28"


def test_rhythm_next_due_monthly_clamps_short_month():
    # Jan 31 + 1 month → Feb 29 (leap) or Feb 28 — dateutil clamps to last day.
    assert _next_due("monthly", "2024-01-31") == "2024-02-29"
    assert _next_due("monthly", "2023-01-31") == "2023-02-28"


def test_rhythm_next_due_quarterly_clamps():
    # Jan 31 + 3 months → Apr 30 (April has 30 days).
    assert _next_due("quarterly", "2024-01-31") == "2024-04-30"


def test_rhythm_next_due_invalid_cadence_defaults_to_weekly():
    assert _next_due("zzz", "2024-01-01") == "2024-01-08"


def test_rhythm_next_due_no_last_observed():
    assert _next_due("weekly", None) is None


def test_sacred_heart_anniversary_feb29_non_leap_year():
    # Anniversary of Feb 29 in 2026 (non-leap) → Feb 28 2026.
    assert _next_anniversary("2024-02-29", date(2026, 2, 1)) == "2026-02-28"


def test_sacred_heart_anniversary_today_is_anniversary():
    # Today == anniversary → today is the next renewal (>= today).
    assert _next_anniversary("2020-05-15", date(2026, 5, 15)) == "2026-05-15"


def test_sacred_heart_anniversary_after_anniversary_rolls_to_next_year():
    assert _next_anniversary("2020-05-15", date(2026, 5, 16)) == "2027-05-15"


# ---------------------------------------------------------------------------
# Liturgical: Traditional 1962 "Sundays after Epiphany" rubric
# ---------------------------------------------------------------------------

def test_traditional_first_sunday_after_epiphany_2026():
    # 2026: Jan 11 is the I Sunday after Epiphany.
    # Note: in the season classification it's still "Christmas" (within Octave),
    # so its name reflects Christmastide. The Sunday after Octave (Jan 18) is II.
    out = liturgical_for(date(2026, 1, 18), variant="traditional")
    assert "II Sunday after Epiphany" in out["name"]


def test_traditional_resumed_epiphany_sundays_2026():
    # In 2026, Easter is Apr 5 → Septuagesima = Feb 1.
    # Available Epi Sundays = (Feb 1 - Jan 11) // 7 = 3.
    # Displaced = 6 - 3 = 3. So IV/V/VI Sundays after Epiphany are resumed
    # in November 2026, immediately before the Last Sunday after Pentecost.
    out_nov_1 = liturgical_for(date(2026, 11, 1), variant="traditional")
    out_nov_8 = liturgical_for(date(2026, 11, 8), variant="traditional")
    out_nov_15 = liturgical_for(date(2026, 11, 15), variant="traditional")
    out_nov_22 = liturgical_for(date(2026, 11, 22), variant="traditional")
    # Nov 1 = All Saints (fixed feast overrides name), but season_label
    # should still show the resumed Epiphany Sunday.
    assert "IV Sunday after Epiphany (resumed)" in out_nov_1["season_label"]
    assert "V Sunday after Epiphany (resumed)" in out_nov_8["name"]
    assert "VI Sunday after Epiphany (resumed)" in out_nov_15["name"]
    assert "Last Sunday after Pentecost" in out_nov_22["season_label"]


def test_traditional_last_sunday_after_pentecost_is_sunday_before_advent():
    # Last Sunday after Pentecost = (1st Sunday of Advent) - 7 days.
    for y in (2024, 2025, 2026, 2027):
        adv1 = first_sunday_of_advent(y)
        last_sun = adv1.fromordinal(adv1.toordinal() - 7)
        out = liturgical_for(last_sun, variant="traditional")
        assert "Last Sunday after Pentecost" in out["season_label"], (
            f"{last_sun} season_label was {out['season_label']!r}"
        )


def test_traditional_xxii_sunday_after_pentecost_2026():
    # In 2026: Oct 25 is XXII Sunday after Pentecost (last regular before resumption).
    out = liturgical_for(date(2026, 10, 25), variant="traditional")
    assert "XXII Sunday after Pentecost" in out["name"]


# ---------------------------------------------------------------------------
# Council finalize idempotency — HTTP integration
# ---------------------------------------------------------------------------

@pytest.fixture
def council_household(seeded_session, mongo_db):
    """Create a fresh household for council tests and link it to the seeded user."""
    user_id = seeded_session["user_id"]
    ts = int(time.time() * 1000)
    hid = f"hh-pytest-{ts}"
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    mongo_db.households.insert_one({
        "household_id": hid,
        "name": "Council Test Household",
        "patron_saint": None,
        "calendar_variant": "roman",
        "created_by": user_id,
        "created_at": now.isoformat(),
    })
    mongo_db.users.update_one({"user_id": user_id}, {"$set": {"current_household_id": hid}})
    yield hid
    # cleanup
    mongo_db.tasks.delete_many({"household_id": hid})
    mongo_db.meetings.delete_many({"household_id": hid})
    mongo_db.households.delete_many({"household_id": hid})
    mongo_db.users.update_one({"user_id": user_id}, {"$set": {"current_household_id": None}})


def test_council_finalize_is_idempotent(auth_client, base_url, council_household):
    # Create meeting
    r = auth_client.post(f"{base_url}/api/council/meeting", json={})
    assert r.status_code == 200, r.text
    mid = r.json()["meeting_id"]

    # Add two assignments (no assignment_id)
    r = auth_client.patch(f"{base_url}/api/council/meeting/{mid}",
                          json={"assignments": [{"title": "Pay tuition"}, {"title": "Plan retreat"}]})
    assert r.status_code == 200

    # First finalize → 2 tasks created
    r = auth_client.post(f"{base_url}/api/council/meeting/{mid}/finalize")
    assert r.status_code == 200
    data = r.json()
    assert data["tasks_created"] == 2
    assert data["tasks_existing"] == 0
    assert data["already"] is False

    # Second finalize (no changes) → 0 new tasks
    r = auth_client.post(f"{base_url}/api/council/meeting/{mid}/finalize")
    data = r.json()
    assert data["tasks_created"] == 0
    assert data["tasks_existing"] == 2
    assert data["already"] is True


def test_council_finalize_diff_only_creates_new_tasks(auth_client, base_url, council_household):
    """Verify diffing: re-finalize only materializes assignments not already tasks,
    even when client drops assignment_ids when re-PATCHing."""
    r = auth_client.post(f"{base_url}/api/council/meeting", json={})
    mid = r.json()["meeting_id"]

    auth_client.patch(f"{base_url}/api/council/meeting/{mid}",
                      json={"assignments": [{"title": "A"}, {"title": "B"}]})
    auth_client.post(f"{base_url}/api/council/meeting/{mid}/finalize")

    # Client PATCHes again, dropping aids and adding a new item
    auth_client.patch(f"{base_url}/api/council/meeting/{mid}",
                      json={"assignments": [{"title": "A"}, {"title": "B"}, {"title": "C"}]})
    r = auth_client.post(f"{base_url}/api/council/meeting/{mid}/finalize")
    data = r.json()
    assert data["tasks_created"] == 1, data  # only C is new
    assert data["tasks_existing"] == 2

    # Total tasks tied to this meeting should be exactly 3 (no duplicates)
    r = auth_client.get(f"{base_url}/api/tasks?include_completed=true")
    tasks = [t for t in r.json()["tasks"] if t.get("source_meeting_id") == mid]
    titles = sorted(t["title"] for t in tasks)
    assert titles == ["A", "B", "C"], titles
