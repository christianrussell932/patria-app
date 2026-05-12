"""Family Council (Weekly Meeting) router."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import date, timedelta

from deps import db, get_household, now_utc, make_id, monday_of_week, Household
from liturgical import liturgical_for

router = APIRouter(prefix="/council", tags=["council"])


class MeetingCreate(BaseModel):
    week_start: Optional[str] = None  # YYYY-MM-DD (Monday)


class MeetingUpdate(BaseModel):
    notes: Optional[str] = None
    decisions: Optional[str] = None
    assignments: Optional[List[dict]] = None
    priorities: Optional[List[str]] = None
    status: Optional[str] = None


async def _build_agenda(h: Household) -> dict:
    today = date.today()
    week_start = monday_of_week(today)
    last_week_start = week_start - timedelta(days=7)
    last_week_end = week_start - timedelta(days=1)
    next_week_end = week_start + timedelta(days=13)

    prayer_last_week = await db.prayer_logs.count_documents({
        "household_id": h.household_id,
        "log_date": {"$gte": last_week_start.isoformat(), "$lte": last_week_end.isoformat()},
    })
    rule_ck_last_week = await db.rule_checkins.count_documents({
        "household_id": h.household_id,
        "checkin_date": {"$gte": last_week_start.isoformat(), "$lte": last_week_end.isoformat()},
    })

    tasks_open = await db.tasks.find(
        {"household_id": h.household_id, "completed": False}, {"_id": 0}
    ).sort("due_date", 1).to_list(50)
    tasks_completed_last_week = await db.tasks.count_documents({
        "household_id": h.household_id, "completed": True,
        "completed_at": {"$gte": last_week_start.isoformat()},
    })
    tasks_overdue = [t for t in tasks_open if t.get("due_date") and t["due_date"] < today.isoformat()]

    y, m = today.year, today.month
    m_start = date(y, m, 1).isoformat()
    m_end_d = date(y + 1, 1, 1) if m == 12 else date(y, m + 1, 1)
    m_end = m_end_d.isoformat()
    cats = await db.budget_categories.find({"household_id": h.household_id}, {"_id": 0}).to_list(100)
    txns = await db.budget_transactions.find(
        {"household_id": h.household_id, "txn_date": {"$gte": m_start, "$lt": m_end}}, {"_id": 0}
    ).to_list(2000)
    over_cats = []
    for c in cats:
        if not c.get("monthly_limit"):
            continue
        spent = sum(t["amount"] for t in txns if t.get("category_id") == c["category_id"])
        if spent > c["monthly_limit"]:
            over_cats.append({"name": c["name"], "spent": spent, "limit": c["monthly_limit"]})

    goals = await db.family_goals.find(
        {"household_id": h.household_id, "completed": False}, {"_id": 0}
    ).sort("created_at", -1).to_list(20)

    events = await db.events.find({
        "household_id": h.household_id,
        "event_date": {"$gte": today.isoformat(), "$lte": next_week_end.isoformat()},
    }, {"_id": 0}).sort("event_date", 1).to_list(50)

    house_doc = await db.households.find_one({"household_id": h.household_id}, {"_id": 0})
    variant = (house_doc or {}).get("calendar_variant", "roman")
    lit_reminders = []
    cursor = today
    while cursor <= next_week_end:
        ld = liturgical_for(cursor, variant=variant)
        if ld["rank"] in ("solemnity", "feast"):
            lit_reminders.append({"date": ld["date"], "name": ld["name"], "color": ld["color"], "rank": ld["rank"]})
        cursor += timedelta(days=1)

    return {
        "week_start": week_start.isoformat(),
        "last_week": {
            "prayer_count": prayer_last_week,
            "rule_checkins": rule_ck_last_week,
            "tasks_completed": tasks_completed_last_week,
        },
        "tasks": {
            "overdue": tasks_overdue, "open_count": len(tasks_open), "open": tasks_open[:10],
        },
        "budget_overages": over_cats,
        "goals": goals[:5],
        "upcoming_events": events,
        "liturgical_reminders": lit_reminders[:8],
    }


@router.get("/agenda")
async def council_agenda(h: Household = Depends(get_household)):
    return await _build_agenda(h)


@router.post("/meeting")
async def create_meeting(payload: MeetingCreate, h: Household = Depends(get_household)):
    week_start = payload.week_start or monday_of_week(date.today()).isoformat()
    agenda = await _build_agenda(h)
    mid = make_id("mtg")
    await db.meetings.insert_one({
        "meeting_id": mid, "household_id": h.household_id, "week_start": week_start,
        "agenda_snapshot": agenda, "notes": "", "decisions": "",
        "assignments": [], "priorities": [], "status": "draft",
        "created_at": now_utc().isoformat(), "finalized_at": None,
    })
    return {"meeting_id": mid}


@router.patch("/meeting/{meeting_id}")
async def update_meeting(meeting_id: str, payload: MeetingUpdate, h: Household = Depends(get_household)):
    update = payload.model_dump(exclude_none=True)
    if update:
        await db.meetings.update_one(
            {"meeting_id": meeting_id, "household_id": h.household_id}, {"$set": update}
        )
    return {"ok": True}


@router.get("/meetings")
async def list_meetings(h: Household = Depends(get_household)):
    mts = await db.meetings.find(
        {"household_id": h.household_id}, {"_id": 0}
    ).sort("week_start", -1).to_list(50)
    return {"meetings": mts}


@router.get("/meeting/{meeting_id}")
async def get_meeting(meeting_id: str, h: Household = Depends(get_household)):
    m = await db.meetings.find_one(
        {"meeting_id": meeting_id, "household_id": h.household_id}, {"_id": 0}
    )
    if not m:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return m


@router.post("/meeting/{meeting_id}/finalize")
async def finalize_meeting(meeting_id: str, h: Household = Depends(get_household)):
    """Finalize a council meeting. Idempotent: re-finalizing diffs against previously
    materialized tasks (tracked by source_meeting_id) and only creates tasks for
    newly-added assignments. Existing tasks are never duplicated."""
    m = await db.meetings.find_one(
        {"meeting_id": meeting_id, "household_id": h.household_id}, {"_id": 0}
    )
    if not m:
        raise HTTPException(status_code=404, detail="Meeting not found")

    # Find tasks already materialized from this meeting
    existing = await db.tasks.find(
        {"household_id": h.household_id, "source_meeting_id": meeting_id}, {"_id": 0}
    ).to_list(500)
    # Dedup strategy: match by assignment_id when present, otherwise by title.
    # Title-based dedup is the robust fallback in case clients PATCH the
    # assignments list without echoing back the assignment_id.
    existing_aids = {t.get("assignment_id") for t in existing if t.get("assignment_id")}
    existing_titles = {(t.get("title") or "").strip() for t in existing}

    assignments = m.get("assignments") or []
    updated_assignments = []
    created_count = 0

    for a in assignments:
        title = (a.get("title") or "").strip()
        if not title:
            updated_assignments.append(a)
            continue
        aid = a.get("assignment_id")
        # Already materialized via stable assignment_id?
        if aid and aid in existing_aids:
            updated_assignments.append(a)
            continue
        # Already materialized via title (fallback when client lost assignment_id)?
        if title in existing_titles:
            # Backfill the assignment_id from the existing task so future
            # PATCHes round-trip correctly even if the client drops it again.
            match = next(
                (t for t in existing if (t.get("title") or "").strip() == title),
                None,
            )
            new_a = {**a}
            if match:
                if match.get("assignment_id"):
                    new_a["assignment_id"] = match["assignment_id"]
                if match.get("task_id"):
                    new_a["task_id"] = match["task_id"]
            updated_assignments.append(new_a)
            continue
        # New assignment — materialize as Task
        if not aid:
            aid = make_id("asg")
        new_task_id = make_id("task")
        await db.tasks.insert_one({
            "task_id": new_task_id, "household_id": h.household_id,
            "title": title, "due_date": a.get("due_date"),
            "assigned_member_id": a.get("member_id"),
            "category": "council", "completed": False, "completed_at": None,
            "created_at": now_utc().isoformat(),
            "source_meeting_id": meeting_id,
            "assignment_id": aid,
        })
        # Track in the in-memory sets so duplicates within the same payload
        # don't materialize twice.
        existing_aids.add(aid)
        existing_titles.add(title)
        new_a = {**a, "assignment_id": aid, "task_id": new_task_id}
        updated_assignments.append(new_a)
        created_count += 1

    set_doc = {"assignments": updated_assignments}
    if m.get("status") != "held":
        set_doc["status"] = "held"
        set_doc["finalized_at"] = now_utc().isoformat()
    await db.meetings.update_one(
        {"meeting_id": meeting_id, "household_id": h.household_id}, {"$set": set_doc}
    )
    return {
        "ok": True,
        "already": m.get("status") == "held",
        "tasks_created": created_count,
        "tasks_existing": len(existing),
    }


@router.delete("/meeting/{meeting_id}")
async def delete_meeting(meeting_id: str, h: Household = Depends(get_household)):
    await db.meetings.delete_one({"meeting_id": meeting_id, "household_id": h.household_id})
    return {"ok": True}
