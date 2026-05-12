"""Patria — Catholic Household OS backend API entry point.

Auth: Emergent-managed Google login (session_id -> session_token cookie).
All domain routes live in /app/backend/routers/.
"""
from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from pathlib import Path
import os
import logging

from deps import client
from routers import (
    auth, household, liturgical, rules, prayer, challenges,
    budget, schedule, tasks, goals, dashboard, council,
    sacred_heart, rhythms,
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

app = FastAPI(title="Patria — Catholic Household OS API")
api = APIRouter(prefix="/api")


@api.get("/")
async def root():
    return {"app": "Patria — Catholic Household OS", "version": "0.2.0"}


# Mount domain routers onto the /api prefix
for r in (
    auth.router, household.router, liturgical.router, rules.router,
    prayer.router, challenges.router, budget.router, schedule.router,
    tasks.router, goals.router, dashboard.router, council.router,
    sacred_heart.router, rhythms.router,
):
    api.include_router(r)

app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
