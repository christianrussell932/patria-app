"""Liturgical router — today + monthly calendar."""
from fastapi import APIRouter
from typing import Optional
from datetime import date

from liturgical import liturgical_for, liturgical_month

router = APIRouter(prefix="/liturgical", tags=["liturgical"])


@router.get("/today")
async def liturgical_today(d: Optional[str] = None, variant: str = "roman"):
    target = date.fromisoformat(d) if d else date.today()
    return liturgical_for(target, variant=variant)


@router.get("/calendar")
async def liturgical_calendar(year: int, month: int, variant: str = "roman"):
    return {"year": year, "month": month, "variant": variant,
            "days": liturgical_month(year, month, variant=variant)}
