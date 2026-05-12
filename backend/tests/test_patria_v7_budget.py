"""Regression tests for v0.7 — Budget & Stewardship expansion.

Covers:
- Category `group` field
- Default category seed (idempotent)
- Income sources CRUD + month-to-month carry forward for recurring only
- Financial goals CRUD + legacy savings_goals visible inline
- Updated `/summary` shape (`income_expected`, `income_from_sources`,
  `over_by` per category)
"""
import os
import time
import pytest
import requests
from datetime import datetime, timezone


def _api(base_url):
    return f"{base_url}/api"


@pytest.fixture
def budget_household(seeded_session, mongo_db):
    """Create an isolated household for budget tests; tear down everything."""
    user_id = seeded_session["user_id"]
    ts = int(time.time() * 1000)
    hid = f"hh-budget-{ts}"
    now = datetime.now(timezone.utc).isoformat()
    mongo_db.households.insert_one({
        "household_id": hid, "name": "Budget Test", "patron_saint": None,
        "calendar_variant": "roman", "created_by": user_id, "created_at": now,
    })
    mongo_db.users.update_one({"user_id": user_id}, {"$set": {"current_household_id": hid}})
    yield hid
    for coll in ("budget_categories", "budget_transactions", "income_sources",
                 "financial_goals", "savings_goals", "households"):
        mongo_db[coll].delete_many({"household_id": hid})
    mongo_db.households.delete_many({"household_id": hid})
    mongo_db.users.update_one({"user_id": user_id}, {"$set": {"current_household_id": None}})


# ---- Default seed -----------------------------------------------------------
def test_seed_defaults_creates_seven_groups(auth_client, base_url, budget_household):
    r = auth_client.post(f"{_api(base_url)}/budget/seed-defaults", json={})
    assert r.status_code == 200
    data = r.json()
    assert data["created"] >= 20  # at least all default rows
    cats = auth_client.get(f"{_api(base_url)}/budget/categories").json()["categories"]
    groups = {c["group"] for c in cats}
    # All seven planning groups present
    for g in ("giving", "housing", "food", "transportation",
              "insurance", "debt", "savings"):
        assert g in groups, f"missing group {g}"


def test_seed_defaults_is_idempotent(auth_client, base_url, budget_household):
    auth_client.post(f"{_api(base_url)}/budget/seed-defaults", json={})
    r = auth_client.post(f"{_api(base_url)}/budget/seed-defaults", json={})
    assert r.status_code == 200
    # Second call must create 0 new categories
    assert r.json()["created"] == 0


# ---- Category group field ---------------------------------------------------
def test_category_group_field_persists(auth_client, base_url, budget_household):
    r = auth_client.post(f"{_api(base_url)}/budget/categories", json={
        "name": "Coffee", "monthly_limit": 40, "group": "food", "kind": "expense"
    })
    cid = r.json()["category_id"]
    cats = auth_client.get(f"{_api(base_url)}/budget/categories").json()["categories"]
    c = next(c for c in cats if c["category_id"] == cid)
    assert c["group"] == "food"


def test_legacy_category_defaults_to_other_group(auth_client, base_url, budget_household, mongo_db):
    # Insert a category directly without a group (simulating v0.6 data)
    mongo_db.budget_categories.insert_one({
        "category_id": "bcat_legacy_test", "household_id": budget_household,
        "name": "Legacy cat", "monthly_limit": 0.0, "color": "slate",
        "kind": "expense", "created_at": datetime.now(timezone.utc).isoformat(),
    })
    cats = auth_client.get(f"{_api(base_url)}/budget/categories").json()["categories"]
    c = next(c for c in cats if c["category_id"] == "bcat_legacy_test")
    assert c["group"] == "other"


# ---- Income sources ---------------------------------------------------------
def test_income_source_crud_and_summary(auth_client, base_url, budget_household):
    api = _api(base_url)
    r = auth_client.post(f"{api}/budget/income-sources", json={
        "name": "Paycheck", "source_type": "paycheck",
        "expected_amount": 2400, "received_amount": 2400, "recurring": True,
    })
    assert r.status_code == 200
    r2 = auth_client.get(f"{api}/budget/income-sources").json()
    assert r2["expected_total"] == 2400
    assert r2["received_total"] == 2400
    assert len(r2["sources"]) == 1
    # Summary income should reflect received_amount
    s = auth_client.get(f"{api}/budget/summary").json()
    assert s["income"] >= 2400
    assert s["income_expected"] >= 2400


def test_income_source_recurring_autocarries(auth_client, base_url, budget_household):
    api = _api(base_url)
    # Create a recurring paycheck in last month
    today = datetime.now(timezone.utc)
    prev_y, prev_m = (today.year, today.month - 1) if today.month > 1 else (today.year - 1, 12)
    r = auth_client.post(f"{api}/budget/income-sources", json={
        "name": "Recurring Paycheck", "source_type": "paycheck",
        "expected_amount": 2500, "received_amount": 2500, "recurring": True,
        "month": prev_m, "year": prev_y,
    })
    assert r.status_code == 200
    # Also create a NON-recurring gift in the same prior month
    auth_client.post(f"{api}/budget/income-sources", json={
        "name": "Birthday gift", "source_type": "gift",
        "expected_amount": 100, "received_amount": 100, "recurring": False,
        "month": prev_m, "year": prev_y,
    })

    # Fetch THIS month — should auto-carry the recurring one only, with received=0
    r = auth_client.get(f"{api}/budget/income-sources").json()
    names = [s["name"] for s in r["sources"]]
    assert "Recurring Paycheck" in names
    assert "Birthday gift" not in names, "Non-recurring should not carry forward"
    carried = next(s for s in r["sources"] if s["name"] == "Recurring Paycheck")
    assert carried["expected_amount"] == 2500
    assert carried["received_amount"] == 0  # received resets
    assert carried.get("carried_from") == f"{prev_y}-{prev_m:02d}"


def test_income_source_autocarry_does_not_duplicate(auth_client, base_url, budget_household):
    """Calling the list endpoint twice must not seed twice."""
    api = _api(base_url)
    today = datetime.now(timezone.utc)
    prev_y, prev_m = (today.year, today.month - 1) if today.month > 1 else (today.year - 1, 12)
    auth_client.post(f"{api}/budget/income-sources", json={
        "name": "Salary", "source_type": "paycheck",
        "expected_amount": 3000, "received_amount": 3000, "recurring": True,
        "month": prev_m, "year": prev_y,
    })
    a = auth_client.get(f"{api}/budget/income-sources").json()
    b = auth_client.get(f"{api}/budget/income-sources").json()
    assert len(a["sources"]) == len(b["sources"]) == 1


def test_income_source_update_and_delete(auth_client, base_url, budget_household):
    api = _api(base_url)
    sid = auth_client.post(f"{api}/budget/income-sources", json={
        "name": "Gig", "source_type": "miscellaneous",
        "expected_amount": 500, "received_amount": 0, "recurring": False,
    }).json()["source_id"]
    auth_client.patch(f"{api}/budget/income-sources/{sid}", json={"received_amount": 500})
    sources = auth_client.get(f"{api}/budget/income-sources").json()["sources"]
    assert sources[0]["received_amount"] == 500
    auth_client.delete(f"{api}/budget/income-sources/{sid}")
    sources = auth_client.get(f"{api}/budget/income-sources").json()["sources"]
    assert sources == []


# ---- Financial goals --------------------------------------------------------
def test_financial_goal_crud(auth_client, base_url, budget_household):
    api = _api(base_url)
    gid = auth_client.post(f"{api}/budget/financial-goals", json={
        "name": "Emergency Fund", "goal_type": "savings",
        "target_amount": 5000, "current_amount": 1500, "target_date": "2026-12-31",
    }).json()["goal_id"]
    goals = auth_client.get(f"{api}/budget/financial-goals").json()["goals"]
    g = next(x for x in goals if x["goal_id"] == gid)
    assert g["legacy"] is False
    assert g["progress_pct"] == 30.0
    assert g["remaining"] == 3500
    auth_client.delete(f"{api}/budget/financial-goals/{gid}")
    goals = auth_client.get(f"{api}/budget/financial-goals").json()["goals"]
    assert not any(x["goal_id"] == gid for x in goals)


def test_financial_goals_include_legacy_savings_goals(auth_client, base_url, budget_household, mongo_db):
    """Legacy savings_goals must appear in the new endpoint with legacy=True."""
    now = datetime.now(timezone.utc).isoformat()
    mongo_db.savings_goals.insert_one({
        "goal_id": "sg_legacy_test", "household_id": budget_household,
        "name": "Old Goal", "target_amount": 1000, "current_amount": 250,
        "deadline": None, "color": "green", "created_at": now,
    })
    goals = auth_client.get(f"{_api(base_url)}/budget/financial-goals").json()["goals"]
    legacy = [g for g in goals if g.get("legacy")]
    assert any(g["goal_id"] == "sg_legacy_test" for g in legacy)
    g = next(g for g in legacy if g["goal_id"] == "sg_legacy_test")
    assert g["goal_type"] == "savings"
    assert g["progress_pct"] == 25.0


def test_financial_goal_rejects_invalid_type(auth_client, base_url, budget_household):
    r = auth_client.post(f"{_api(base_url)}/budget/financial-goals", json={
        "name": "Bad", "goal_type": "nonsense", "target_amount": 100,
    })
    assert r.status_code == 400


def test_financial_goal_rejects_zero_target(auth_client, base_url, budget_household):
    r = auth_client.post(f"{_api(base_url)}/budget/financial-goals", json={
        "name": "Zero", "goal_type": "savings", "target_amount": 0,
    })
    assert r.status_code == 400


# ---- Summary fields ---------------------------------------------------------
def test_summary_exposes_over_by_per_category(auth_client, base_url, budget_household):
    api = _api(base_url)
    cid = auth_client.post(f"{api}/budget/categories", json={
        "name": "Dining out", "monthly_limit": 100, "group": "food",
    }).json()["category_id"]
    auth_client.post(f"{api}/budget/transactions", json={
        "amount": 150, "type": "expense", "category_id": cid,
    })
    s = auth_client.get(f"{api}/budget/summary").json()
    cat = next(c for c in s["categories"] if c["category_id"] == cid)
    assert cat["spent"] == 150
    assert cat["over_by"] == 50
    assert cat["pct"] == 150.0
