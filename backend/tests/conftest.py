import os
from pathlib import Path

from dotenv import dotenv_values
from sqlalchemy.engine import make_url

# Point the app at a separate test database BEFORE the app is imported
ROOT_ENV = Path(__file__).resolve().parents[2] / ".env"
real_url = dotenv_values(ROOT_ENV).get("DATABASE_URL") or os.environ.get("DATABASE_URL", "")
test_url = make_url(real_url).set(database="timemate_test").render_as_string(hide_password=False)
os.environ["DATABASE_URL"] = test_url

import pytest
from fastapi.testclient import TestClient

from app.core.database import Base, engine
from app.main import app


@pytest.fixture(scope="session", autouse=True)
def create_tables():
    assert engine.url.database == "timemate_test", "Tests must only run on the test database"
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    yield


@pytest.fixture(autouse=True)
def clean_tables():
    yield
    with engine.begin() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            conn.execute(table.delete())


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def make_user(client):
    def _make(email="user@example.com", name="Test User", timezone="Asia/Karachi"):
        r = client.post(
            "/auth/register",
            json={"name": name, "email": email, "password": "password123", "timezone": timezone},
        )
        assert r.status_code == 201, r.text
        r = client.post("/auth/login", data={"username": email, "password": "password123"})
        assert r.status_code == 200, r.text
        return {"Authorization": f"Bearer {r.json()['access_token']}"}

    return _make