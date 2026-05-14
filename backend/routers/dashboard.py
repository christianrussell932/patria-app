"""Dashboard aggregator router."""
from fastapi import APIRouter, Depends
from datetime import date, timedelta

from deps import db, get_household, Household
from liturgical import liturgical_for

router = APIRouter(tags=["dashboard"])


@router.get("/dashboard")
async def dashboard(h: Household = Depends(get_household)):
    today = date.today()
    today_str = today.isoformat()
    week_start_str = (today - timedelta(days=6)).isoformat()
    week_end_str = (today + timedelta(days=7)).isoformat()

    # Liturgical
    house_doc = await db.households.find_one({"household_id": h.household_id}, {"_id": 0})
    variant = (house_doc or {}).get("calendar_variant", "roman")
    if variant not in ("roman", "traditional"):
        variant = "roman"
    lit = liturgical_for(today, variant=variant)

    # Members
    members = await db.members.find({"household_id": h.household_id}, {"_id": 0}).to_list(50)

    # Today's schedule
    todays_events = await db.events.find(
        {"household_id": h.household_id, "event_date": today_str}, {"_id": 0}
    ).sort("event_time", 1).to_list(50)
    upcoming_events = await db.events.find(
        {"household_id": h.household_id, "event_date": {"$gt": today_str, "$lte": week_end_str}},
        {"_id": 0},
    ).sort("event_date", 1).to_list(20)

    date_night = await db.events.find_one(
        {"household_id": h.household_id, "type": "date_night", "event_date": {"$gte": today_str}},
        {"_id": 0}, sort=[("event_date", 1)],
    )

    # Tasks
    open_tasks = await db.tasks.find(
        {"household_id": h.household_id, "completed": False}, {"_id": 0}
    ).sort("due_date", 1).to_list(20)
    tasks_due_today = [t for t in open_tasks if t.get("due_date") == today_str]
    tasks_overdue = [t for t in open_tasks if t.get("due_date") and t["due_date"] < today_str]

    # Prayer streak — consecutive days at least one log in household
    streak = 0
    cursor_date = today
    for _ in range(60):
        cnt = await db.prayer_logs.count_documents(
            {"household_id": h.household_id, "log_date": cursor_date.isoformat()}
        )
        if cnt > 0:
            streak += 1
            cursor_date -= timedelta(days=1)
        else:
            if cursor_date == today:
                cursor_date -= timedelta(days=1)
                continue
            break
    week_prayer_count = await db.prayer_logs.count_documents(
        {"household_id": h.household_id, "log_date": {"$gte": week_start_str}}
    )

    # Budget summary (current month)
    y, m = today.year, today.month
    m_start = date(y, m, 1).isoformat()
    m_end_d = date(y + 1, 1, 1) if m == 12 else date(y, m + 1, 1)
    m_end = m_end_d.isoformat()
    txns = await db.budget_transactions.find(
        {"household_id": h.household_id, "txn_date": {"$gte": m_start, "$lt": m_end}}, {"_id": 0}
    ).to_list(2000)
    income = sum(t["amount"] for t in txns if t["type"] == "income")
    expense = sum(t["amount"] for t in txns if t["type"] == "expense")
    giving = sum(t["amount"] for t in txns if t["type"] == "giving")
    cats = await db.budget_categories.find({"household_id": h.household_id}, {"_id": 0}).to_list(100)
    over_cats = []
    for c in cats:
        if not c.get("monthly_limit"):
            continue
        spent = sum(t["amount"] for t in txns if t.get("category_id") == c["category_id"])
        if spent > c["monthly_limit"]:
            over_cats.append({"name": c["name"], "spent": spent, "limit": c["monthly_limit"]})

    # Active challenge
    active_ch = await db.challenges.find_one(
        {"household_id": h.household_id, "status": "active"}, {"_id": 0}
    )
    if active_ch:
        try:
            sd = date.fromisoformat(active_ch["start_date"])
            day_num = (today - sd).days + 1
        except Exception:
            day_num = 1
        active_ch["current_day"] = max(1, min(day_num, active_ch["days_total"]))
        active_ch["completion_pct"] = round(
            ((active_ch["current_day"] - 1) / active_ch["days_total"]) * 100, 1
        ) if active_ch["days_total"] else 0

    # Goals progress
    goals = await db.family_goals.find(
        {"household_id": h.household_id, "completed": False}, {"_id": 0}
    ).sort("created_at", -1).to_list(20)

    return {
        "household": house_doc,
        "members_count": len(members),
        "liturgical": lit,
        "today": today_str,
        "todays_events": todays_events,
        "upcoming_events": upcoming_events,
        "date_night": date_night,
        "tasks": {
            "due_today": tasks_due_today,
            "overdue": tasks_overdue,
            "open_count": len(open_tasks),
        },
        "prayer": {"streak_days": streak, "week_count": week_prayer_count},
        "budget": {
            "income": income, "expense": expense, "giving": giving,
            "net": income - expense - giving,
            "tithe_pct": round((giving / income) * 100, 1) if income else 0,
            "over_categories": over_cats,
        },
        "active_challenge": active_ch,
        "goals": {
            "items": goals[:3], "open_count": len(goals),
        },
    }
