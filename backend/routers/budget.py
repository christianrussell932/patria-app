"""Budget & Stewardship router — categories (grouped), transactions, income
sources (with month-to-month carry-forward for recurring), financial goals,
savings goals (legacy, read-only display), and a default seed.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date

from deps import db, get_household, now_utc, make_id, Household

router = APIRouter(prefix="/budget", tags=["budget"])


# ---------------------------------------------------------------------------
# Category groups — used to render the budget as a stewardship planner
# rather than a flat list. The values are stable enum-like keys.
# ---------------------------------------------------------------------------
CATEGORY_GROUPS = ("giving", "housing", "food", "transportation",
                   "insurance", "debt", "savings", "other")
DEFAULT_GROUP = "other"

GOAL_TYPES = ("savings", "debt_payoff", "giving", "other")

INCOME_SOURCE_TYPES = ("paycheck", "spouse_paycheck", "gift",
                       "tax_refund", "miscellaneous", "custom")


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class BudgetCategoryCreate(BaseModel):
    name: str
    monthly_limit: float = 0.0
    color: str = "slate"
    kind: str = "expense"  # expense | giving | savings
    group: str = DEFAULT_GROUP


class BudgetCategoryUpdate(BaseModel):
    name: Optional[str] = None
    monthly_limit: Optional[float] = None
    color: Optional[str] = None
    kind: Optional[str] = None
    group: Optional[str] = None


class TransactionCreate(BaseModel):
    category_id: Optional[str] = None
    amount: float
    type: str = "expense"
    note: Optional[str] = None
    txn_date: Optional[str] = None
    member_id: Optional[str] = None


class IncomeSourceCreate(BaseModel):
    name: str
    source_type: str = "custom"
    expected_amount: float = 0.0
    received_amount: float = 0.0
    month: Optional[int] = None
    year: Optional[int] = None
    recurring: bool = False
    notes: Optional[str] = None


class IncomeSourceUpdate(BaseModel):
    name: Optional[str] = None
    source_type: Optional[str] = None
    expected_amount: Optional[float] = None
    received_amount: Optional[float] = None
    recurring: Optional[bool] = None
    notes: Optional[str] = None


class FinancialGoalCreate(BaseModel):
    name: str
    goal_type: str = "savings"
    target_amount: float
    current_amount: float = 0.0
    target_date: Optional[str] = None
    monthly_contribution: Optional[float] = None
    color: str = "green"
    notes: Optional[str] = None


class FinancialGoalUpdate(BaseModel):
    name: Optional[str] = None
    goal_type: Optional[str] = None
    target_amount: Optional[float] = None
    current_amount: Optional[float] = None
    target_date: Optional[str] = None
    monthly_contribution: Optional[float] = None
    color: Optional[str] = None
    notes: Optional[str] = None


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


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _resolve_my(month: Optional[int], year: Optional[int]) -> tuple[int, int]:
    today = date.today()
    return (month or today.month, year or today.year)


def _normalize_group(g: Optional[str]) -> str:
    if g and g in CATEGORY_GROUPS:
        return g
    return DEFAULT_GROUP


# ---------------------------------------------------------------------------
# Categories
# ---------------------------------------------------------------------------
@router.get("/categories")
async def list_budget_categories(h: Household = Depends(get_household)):
    cats = await db.budget_categories.find(
        {"household_id": h.household_id}, {"_id": 0}
    ).to_list(500)
    for c in cats:
        c.setdefault("group", DEFAULT_GROUP)
    return {"categories": cats}


@router.post("/categories")
async def create_budget_category(payload: BudgetCategoryCreate, h: Household = Depends(get_household)):
    cid = make_id("bcat")
    await db.budget_categories.insert_one({
        "category_id": cid, "household_id": h.household_id, "name": payload.name,
        "monthly_limit": payload.monthly_limit, "color": payload.color,
        "kind": payload.kind, "group": _normalize_group(payload.group),
        "created_at": now_utc().isoformat(),
    })
    return {"category_id": cid}


@router.patch("/categories/{category_id}")
async def update_budget_category(category_id: str, payload: BudgetCategoryUpdate, h: Household = Depends(get_household)):
    update = payload.model_dump(exclude_none=True)
    if "group" in update:
        update["group"] = _normalize_group(update["group"])
    if update:
        await db.budget_categories.update_one(
            {"category_id": category_id, "household_id": h.household_id}, {"$set": update}
        )
    return {"ok": True}


@router.delete("/categories/{category_id}")
async def delete_budget_category(category_id: str, h: Household = Depends(get_household)):
    await db.budget_categories.delete_one({"category_id": category_id, "household_id": h.household_id})
    await db.budget_transactions.delete_many({"category_id": category_id, "household_id": h.household_id})
    return {"ok": True}


# ---------------------------------------------------------------------------
# Seed defaults — the 7 starter category groups + a baseline income source
# ---------------------------------------------------------------------------
DEFAULT_CATEGORIES: list[tuple[str, str, str, str]] = [
    # (name, group, kind, color)
    ("Tithe / Church Giving",   "giving",         "giving",  "rose"),
    ("Charity",                 "giving",         "giving",  "rose"),
    ("Other Giving",            "giving",         "giving",  "rose"),

    ("Mortgage / Rent",         "housing",        "expense", "slate"),
    ("Internet",                "housing",        "expense", "slate"),
    ("Heating / Gas",           "housing",        "expense", "slate"),
    ("Electric",                "housing",        "expense", "slate"),
    ("Water",                   "housing",        "expense", "slate"),
    ("Sewer",                   "housing",        "expense", "slate"),

    ("Groceries",               "food",           "expense", "green"),
    ("Household Essentials",    "food",           "expense", "green"),
    ("Miscellaneous",           "food",           "expense", "green"),

    ("Auto Gas",                "transportation", "expense", "violet"),
    ("Vehicle Maintenance",     "transportation", "expense", "violet"),

    ("Health",                  "insurance",      "expense", "white"),
    ("Health Insurance",        "insurance",      "expense", "white"),
    ("Auto Insurance",          "insurance",      "expense", "white"),

    ("Debt Payments",           "debt",           "expense", "red"),
    ("Taxes",                   "debt",           "expense", "red"),

    ("Emergency Fund",          "savings",        "savings", "green"),
    ("Short-Term Savings",      "savings",        "savings", "green"),
]


@router.post("/seed-defaults")
async def seed_defaults(h: Household = Depends(get_household)):
    """Seed the default category structure. Idempotent — skips any category
    that already exists (matched by name within this household). Returns the
    number of categories newly created."""
    existing = await db.budget_categories.find(
        {"household_id": h.household_id}, {"_id": 0, "name": 1}
    ).to_list(500)
    existing_names = {c["name"] for c in existing}
    created = 0
    for name, group, kind, color in DEFAULT_CATEGORIES:
        if name in existing_names:
            continue
        await db.budget_categories.insert_one({
            "category_id": make_id("bcat"), "household_id": h.household_id,
            "name": name, "monthly_limit": 0.0, "color": color,
            "kind": kind, "group": group,
            "created_at": now_utc().isoformat(),
        })
        created += 1
    return {"ok": True, "created": created}


# ---------------------------------------------------------------------------
# Transactions
# ---------------------------------------------------------------------------
@router.post("/transactions")
async def create_transaction(payload: TransactionCreate, h: Household = Depends(get_household)):
    if payload.type not in ("expense", "income", "giving"):
        raise HTTPException(status_code=400, detail="type must be expense, income, or giving")
    if payload.amount is None or payload.amount < 0:
        raise HTTPException(status_code=400, detail="amount must be non-negative")
    tid = make_id("txn")
    await db.budget_transactions.insert_one({
        "txn_id": tid, "household_id": h.household_id, "category_id": payload.category_id,
        "amount": payload.amount, "type": payload.type, "note": payload.note,
        "member_id": payload.member_id,
        "txn_date": payload.txn_date or date.today().isoformat(),
        "created_at": now_utc().isoformat(),
    })
    return {"txn_id": tid}


@router.get("/transactions")
async def list_transactions(month: Optional[int] = None, year: Optional[int] = None, h: Household = Depends(get_household)):
    m, y = _resolve_my(month, year)
    start = date(y, m, 1).isoformat()
    end_d = date(y + 1, 1, 1) if m == 12 else date(y, m + 1, 1)
    end = end_d.isoformat()
    txns = await db.budget_transactions.find(
        {"household_id": h.household_id, "txn_date": {"$gte": start, "$lt": end}}, {"_id": 0},
    ).sort("txn_date", -1).to_list(2000)
    return {"month": m, "year": y, "transactions": txns}


@router.delete("/transactions/{txn_id}")
async def delete_transaction(txn_id: str, h: Household = Depends(get_household)):
    await db.budget_transactions.delete_one({"txn_id": txn_id, "household_id": h.household_id})
    return {"ok": True}


# ---------------------------------------------------------------------------
# Income sources
# ---------------------------------------------------------------------------
async def _autocarry_recurring_income(h: Household, m: int, y: int) -> None:
    """If there are no income sources for (m, y) yet, seed from the most
    recent prior month's recurring sources. Each carried source gets the
    same expected_amount; received_amount resets to 0."""
    any_for_month = await db.income_sources.find_one(
        {"household_id": h.household_id, "month": m, "year": y}, {"_id": 0}
    )
    if any_for_month:
        return
    prior = await db.income_sources.find(
        {"household_id": h.household_id, "recurring": True,
         "$or": [
             {"year": {"$lt": y}},
             {"year": y, "month": {"$lt": m}},
         ]},
        {"_id": 0},
    ).sort([("year", -1), ("month", -1)]).to_list(50)
    if not prior:
        return
    # Use only the latest prior month's recurring set
    latest_year = prior[0]["year"]
    latest_month = max(p["month"] for p in prior if p["year"] == latest_year)
    seed = [p for p in prior if p["year"] == latest_year and p["month"] == latest_month]
    for s in seed:
        await db.income_sources.insert_one({
            "source_id": make_id("inc"), "household_id": h.household_id,
            "name": s["name"], "source_type": s.get("source_type", "custom"),
            "expected_amount": s.get("expected_amount", 0.0),
            "received_amount": 0.0,
            "month": m, "year": y, "recurring": True,
            "notes": s.get("notes"),
            "created_at": now_utc().isoformat(),
            "carried_from": f"{latest_year}-{latest_month:02d}",
        })


@router.get("/income-sources")
async def list_income_sources(month: Optional[int] = None, year: Optional[int] = None, h: Household = Depends(get_household)):
    m, y = _resolve_my(month, year)
    await _autocarry_recurring_income(h, m, y)
    sources = await db.income_sources.find(
        {"household_id": h.household_id, "month": m, "year": y}, {"_id": 0}
    ).sort("created_at", 1).to_list(200)
    expected_total = sum(s.get("expected_amount", 0) for s in sources)
    received_total = sum(s.get("received_amount", 0) for s in sources)
    return {
        "month": m, "year": y,
        "sources": sources,
        "expected_total": expected_total,
        "received_total": received_total,
    }


@router.post("/income-sources")
async def create_income_source(payload: IncomeSourceCreate, h: Household = Depends(get_household)):
    m, y = _resolve_my(payload.month, payload.year)
    if payload.source_type not in INCOME_SOURCE_TYPES:
        raise HTTPException(status_code=400, detail=f"source_type must be one of {INCOME_SOURCE_TYPES}")
    sid = make_id("inc")
    await db.income_sources.insert_one({
        "source_id": sid, "household_id": h.household_id,
        "name": payload.name, "source_type": payload.source_type,
        "expected_amount": payload.expected_amount,
        "received_amount": payload.received_amount,
        "month": m, "year": y, "recurring": payload.recurring,
        "notes": payload.notes,
        "created_at": now_utc().isoformat(),
    })
    return {"source_id": sid}


@router.patch("/income-sources/{source_id}")
async def update_income_source(source_id: str, payload: IncomeSourceUpdate, h: Household = Depends(get_household)):
    update = payload.model_dump(exclude_none=True)
    if "source_type" in update and update["source_type"] not in INCOME_SOURCE_TYPES:
        raise HTTPException(status_code=400, detail=f"source_type must be one of {INCOME_SOURCE_TYPES}")
    if update:
        await db.income_sources.update_one(
            {"source_id": source_id, "household_id": h.household_id}, {"$set": update}
        )
    return {"ok": True}


@router.delete("/income-sources/{source_id}")
async def delete_income_source(source_id: str, h: Household = Depends(get_household)):
    await db.income_sources.delete_one({"source_id": source_id, "household_id": h.household_id})
    return {"ok": True}


# ---------------------------------------------------------------------------
# Financial goals (new — supersedes savings_goals; legacy still readable)
# ---------------------------------------------------------------------------
@router.get("/financial-goals")
async def list_financial_goals(h: Household = Depends(get_household)):
    """Returns both new financial_goals and legacy savings_goals (read-only).
    Legacy goals appear as goal_type='savings' with a `legacy=True` flag so
    the UI can distinguish them but still display them inline."""
    new_goals = await db.financial_goals.find(
        {"household_id": h.household_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(200)
    for g in new_goals:
        g["legacy"] = False
        # remaining + progress_pct convenience
        target = g.get("target_amount") or 0
        current = g.get("current_amount") or 0
        g["remaining"] = max(0.0, target - current)
        g["progress_pct"] = round((current / target) * 100, 1) if target else 0

    legacy = await db.savings_goals.find(
        {"household_id": h.household_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(200)
    legacy_mapped = []
    for g in legacy:
        target = g.get("target_amount") or 0
        current = g.get("current_amount") or 0
        legacy_mapped.append({
            "goal_id": g.get("goal_id"),
            "name": g.get("name"),
            "goal_type": "savings",
            "target_amount": target,
            "current_amount": current,
            "target_date": g.get("deadline"),
            "monthly_contribution": None,
            "color": g.get("color", "green"),
            "notes": None,
            "legacy": True,
            "remaining": max(0.0, target - current),
            "progress_pct": round((current / target) * 100, 1) if target else 0,
            "created_at": g.get("created_at"),
        })
    return {"goals": new_goals + legacy_mapped}


@router.post("/financial-goals")
async def create_financial_goal(payload: FinancialGoalCreate, h: Household = Depends(get_household)):
    if payload.goal_type not in GOAL_TYPES:
        raise HTTPException(status_code=400, detail=f"goal_type must be one of {GOAL_TYPES}")
    if payload.target_amount is None or payload.target_amount <= 0:
        raise HTTPException(status_code=400, detail="target_amount must be positive")
    gid = make_id("fgoal")
    await db.financial_goals.insert_one({
        "goal_id": gid, "household_id": h.household_id,
        "name": payload.name, "goal_type": payload.goal_type,
        "target_amount": payload.target_amount,
        "current_amount": payload.current_amount,
        "target_date": payload.target_date,
        "monthly_contribution": payload.monthly_contribution,
        "color": payload.color, "notes": payload.notes,
        "created_at": now_utc().isoformat(),
    })
    return {"goal_id": gid}


@router.patch("/financial-goals/{goal_id}")
async def update_financial_goal(goal_id: str, payload: FinancialGoalUpdate, h: Household = Depends(get_household)):
    update = payload.model_dump(exclude_none=True)
    if "goal_type" in update and update["goal_type"] not in GOAL_TYPES:
        raise HTTPException(status_code=400, detail=f"goal_type must be one of {GOAL_TYPES}")
    if update:
        await db.financial_goals.update_one(
            {"goal_id": goal_id, "household_id": h.household_id}, {"$set": update}
        )
    return {"ok": True}


@router.delete("/financial-goals/{goal_id}")
async def delete_financial_goal(goal_id: str, h: Household = Depends(get_household)):
    await db.financial_goals.delete_one({"goal_id": goal_id, "household_id": h.household_id})
    return {"ok": True}


# ---------------------------------------------------------------------------
# Summary — now blends income_sources (received) with legacy income txns
# ---------------------------------------------------------------------------
@router.get("/summary")
async def budget_summary(month: Optional[int] = None, year: Optional[int] = None, h: Household = Depends(get_household)):
    m, y = _resolve_my(month, year)
    start = date(y, m, 1).isoformat()
    end_d = date(y + 1, 1, 1) if m == 12 else date(y, m + 1, 1)
    end = end_d.isoformat()

    cats = await db.budget_categories.find({"household_id": h.household_id}, {"_id": 0}).to_list(500)
    for c in cats:
        c.setdefault("group", DEFAULT_GROUP)
    txns = await db.budget_transactions.find(
        {"household_id": h.household_id, "txn_date": {"$gte": start, "$lt": end}}, {"_id": 0}
    ).to_list(5000)

    # Income now sums (a) received_amount from income_sources for this month,
    # PLUS (b) legacy income-type transactions (so older data still renders).
    await _autocarry_recurring_income(h, m, y)
    income_sources = await db.income_sources.find(
        {"household_id": h.household_id, "month": m, "year": y}, {"_id": 0}
    ).to_list(200)
    income_from_sources = sum(s.get("received_amount", 0) for s in income_sources)
    expected_from_sources = sum(s.get("expected_amount", 0) for s in income_sources)
    income_from_txns = sum(t["amount"] for t in txns if t["type"] == "income")
    income_total = income_from_sources + income_from_txns

    expense_total = sum(t["amount"] for t in txns if t["type"] == "expense")
    giving_total = sum(t["amount"] for t in txns if t["type"] == "giving")

    by_cat = {}
    for t in txns:
        if t.get("category_id"):
            by_cat[t["category_id"]] = by_cat.get(t["category_id"], 0) + t["amount"]

    cat_progress = []
    for c in cats:
        spent = by_cat.get(c["category_id"], 0)
        limit = c.get("monthly_limit") or 0
        cat_progress.append({
            **c, "spent": spent,
            "remaining": limit - spent,
            "over_by": max(0.0, spent - limit) if limit else 0.0,
            "pct": round((spent / limit) * 100, 1) if limit else 0,
        })

    tithe_pct = round((giving_total / income_total) * 100, 1) if income_total else 0
    return {
        "month": m, "year": y,
        "income": income_total,
        "income_expected": expected_from_sources,
        "income_from_sources": income_from_sources,
        "income_from_transactions": income_from_txns,
        "expense": expense_total,
        "giving": giving_total,
        "tithe_pct": tithe_pct,
        "net": income_total - expense_total - giving_total,
        "categories": cat_progress,
    }


# ---------------------------------------------------------------------------
# Legacy savings goals — preserved (read + write) for backward compat.
# The new UI displays them inside the Financial Goals panel via /financial-goals.
# ---------------------------------------------------------------------------
@router.get("/savings-goals")
async def list_savings_goals(h: Household = Depends(get_household)):
    goals = await db.savings_goals.find({"household_id": h.household_id}, {"_id": 0}).to_list(100)
    return {"goals": goals}


@router.post("/savings-goals")
async def create_savings_goal(payload: SavingsGoalCreate, h: Household = Depends(get_household)):
    gid = make_id("sg")
    await db.savings_goals.insert_one({
        "goal_id": gid, "household_id": h.household_id, "name": payload.name,
        "target_amount": payload.target_amount, "current_amount": payload.current_amount,
        "deadline": payload.deadline, "color": payload.color,
        "created_at": now_utc().isoformat(),
    })
    return {"goal_id": gid}


@router.patch("/savings-goals/{goal_id}")
async def update_savings_goal(goal_id: str, payload: SavingsGoalUpdate, h: Household = Depends(get_household)):
    update = payload.model_dump(exclude_none=True)
    if update:
        await db.savings_goals.update_one(
            {"goal_id": goal_id, "household_id": h.household_id}, {"$set": update}
        )
    return {"ok": True}


@router.delete("/savings-goals/{goal_id}")
async def delete_savings_goal(goal_id: str, h: Household = Depends(get_household)):
    await db.savings_goals.delete_one({"goal_id": goal_id, "household_id": h.household_id})
    return {"ok": True}
