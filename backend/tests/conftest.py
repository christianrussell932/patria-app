import os
import time
import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://emergent-blueprint-2.preview.emergentagent.com').rstrip('/')


@pytest.fixture(scope="session")
def base_url():
    return BASE_URL


@pytest.fixture(scope="session")
def mongo_db():
    # Use local mongo for direct seeding (backend uses test_database)
    cli = MongoClient("mongodb://localhost:27017")
    return cli["test_database"]


@pytest.fixture(scope="session")
def seeded_session(mongo_db):
    """Create a fresh user + session in Mongo and return token."""
    ts = int(time.time() * 1000)
    user_id = f"test-user-{ts}"
    session_token = f"test_session_{ts}"
    from datetime import datetime, timezone, timedelta
    now = datetime.now(timezone.utc)
    mongo_db.users.insert_one({
        "user_id": user_id,
        "email": f"test.user.{ts}@example.com",
        "name": "Pytest User",
        "picture": None,
        "current_household_id": None,
        "created_at": now.isoformat(),
    })
    mongo_db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": (now + timedelta(days=7)).isoformat(),
        "created_at": now.isoformat(),
    })
    yield {"user_id": user_id, "session_token": session_token}
    # cleanup
    mongo_db.user_sessions.delete_many({"user_id": user_id})
    mongo_db.users.delete_many({"user_id": user_id})


@pytest.fixture(scope="session")
def auth_client(seeded_session):
    s = requests.Session()
    s.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {seeded_session['session_token']}",
    })
    return s


@pytest.fixture(scope="session")
def anon_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s
