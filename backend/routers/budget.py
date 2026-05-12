"""Budget & Stewardship router — categories, transactions, savings goals."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import date

from deps import db, get_household, now_utc, make_id, Household

router = APIRouter(prefix="/budget", tags=["budget"])


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


class TransactionCreate(BaseModel):
    category_id: Optional[str] = None
    amount: float
    type: str = "expense"  # expense | income | giving
    note: Optional[str] = None
    txn_date: Optional[str] = None  # YYYY-MM-DD
    member_id: Optional[str] = None


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


@router.get("/categories")
async def list_budget_categories(h: Household = Depends(get_household)):
    cats = await db.budget_categories.find(
        {"household_id": h.household_id}, {"_id": 0}
    ).to_list(200)
    return {"categories": cats}


@router.post("/categories")
async def create_budget_category(payload: BudgetCategoryCreate, h: Household = Depends(get_household)):
    cid = make_id("bcat")
    await db.budget_categories.insert_one({
        "category_id": cid, "household_id": h.household_id, "name": payload.name,
        "monthly_limit": payload.monthly_limit, "color": payload.color,
        "kind": payload.kind, "created_at": now_utc().isoformat(),
    })
    return {"category_id": cid}


@router.patch("/categories/{category_id}")
async def update_budget_category(category_id: str, payload: BudgetCategoryUpdate, h: Household = Depends(get_household)):
    update = payload.model_dump(exclude_none=True)
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
    today = date.today()
    y = year or today.year
    m = month or today.month
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


@router.get("/summary")
async def budget_summary(month: Optional[int] = None, year: Optional[int] = None, h: Household = Depends(get_household)):
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
            **c, "spent": spent,
            "remaining": (c.get("monthly_limit") or 0) - spent,
            "pct": round((spent / c["monthly_limit"]) * 100, 1) if c.get("monthly_limit") else 0,
        })

    tithe_pct = round((giving_total / income_total) * 100, 1) if income_total else 0
    return {
        "month": m, "year": y, "income": income_total, "expense": expense_total,
        "giving": giving_total, "tithe_pct": tithe_pct,
        "net": income_total - expense_total - giving_total, "categories": cat_progress,
    }


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
