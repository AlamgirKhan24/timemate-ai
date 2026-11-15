import json
import hashlib
import hmac
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from app.core.config import settings


def when(hours):
    moment = datetime.now(timezone.utc) + timedelta(hours=hours)
    return moment.strftime("%Y-%m-%dT%H:%M:%S")


def create_task(client, headers, hours=24, title="Study"):
    r = client.post("/tasks", json={"title": title, "start_at": when(hours)}, headers=headers)
    assert r.status_code == 201, r.text
    return r.json()


def test_register_login_and_me(client, make_user):
    headers = make_user()
    r = client.get("/users/me", headers=headers)
    assert r.status_code == 200
    assert r.json()["email"] == "user@example.com"
    assert "password" not in r.text


def test_duplicate_email_rejected(client, make_user):
    make_user()
    r = client.post(
        "/auth/register",
        json={"name": "Other", "email": "user@example.com", "password": "password123"},
    )
    assert r.status_code == 400


def test_wrong_password_rejected(client, make_user):
    make_user()
    r = client.post("/auth/login", data={"username": "user@example.com", "password": "wrong-password"})
    assert r.status_code == 401


def test_invalid_timezone_rejected(client, make_user):
    r = client.post(
        "/auth/register",
        json={"name": "Bad Zone", "email": "zone@example.com", "password": "password123", "timezone": "Mars/Base"},
    )
    assert r.status_code == 422
    headers = make_user()
    r = client.put("/users/me", json={"timezone": "Mars/Base"}, headers=headers)
    assert r.status_code == 422


def test_tasks_require_login(client):
    assert client.get("/tasks").status_code == 401


def test_task_create_edit_delete(client, make_user):
    headers = make_user()
    task = create_task(client, headers)
    r = client.put(f"/tasks/{task['id']}", json={"status": "completed"}, headers=headers)
    assert r.status_code == 200
    assert r.json()["status"] == "completed"
    assert client.delete(f"/tasks/{task['id']}", headers=headers).status_code == 204
    assert client.get(f"/tasks/{task['id']}", headers=headers).status_code == 404


def test_user_cannot_see_or_change_another_users_task(client, make_user):
    alice = make_user("alice@example.com")
    bob = make_user("bob@example.com")
    task = create_task(client, alice)

    assert client.get(f"/tasks/{task['id']}", headers=bob).status_code == 404
    assert client.put(f"/tasks/{task['id']}", json={"title": "Hacked"}, headers=bob).status_code == 404
    assert client.delete(f"/tasks/{task['id']}", headers=bob).status_code == 404
    assert client.get("/tasks", headers=bob).json() == []
    assert client.get(f"/tasks/{task['id']}", headers=alice).json()["title"] == "Study"


def test_reminder_created_once_per_offset(client, make_user):
    headers = make_user()
    task = create_task(client, headers)
    body = {"task_id": task["id"], "offset_minutes": 30}
    assert client.post("/reminders", json=body, headers=headers).status_code == 201
    assert client.post("/reminders", json=body, headers=headers).status_code == 409


def test_reminder_in_the_past_rejected(client, make_user):
    headers = make_user()
    task = create_task(client, headers, hours=-2)
    r = client.post("/reminders", json={"task_id": task["id"], "offset_minutes": 0}, headers=headers)
    assert r.status_code == 400


def test_user_cannot_add_reminder_to_another_users_task(client, make_user):
    alice = make_user("alice@example.com")
    bob = make_user("bob@example.com")
    task = create_task(client, alice)
    r = client.post("/reminders", json={"task_id": task["id"], "offset_minutes": 0}, headers=bob)
    assert r.status_code == 404


def test_logout_revokes_existing_token(client, make_user):
    headers = make_user()
    assert client.post("/auth/logout", headers=headers).status_code == 204
    assert client.get("/users/me", headers=headers).status_code == 401


def test_calendar_overview_and_report(client, make_user):
    headers = make_user()
    zone = ZoneInfo("Asia/Karachi")
    today = datetime.now(zone).date()
    local_task_time = datetime.combine(today, datetime.min.time(), tzinfo=zone).replace(
        hour=23, minute=59
    )
    task = client.post(
        "/tasks",
        json={"title": "Today's task", "start_at": local_task_time.isoformat()},
        headers=headers,
    ).json()
    client.put(f"/tasks/{task['id']}", json={"status": "completed"}, headers=headers)

    calendar = client.get(
        "/calendar",
        params={"start": today.isoformat(), "end": (today + timedelta(days=1)).isoformat()},
        headers=headers,
    )
    assert calendar.status_code == 200
    assert [item["id"] for item in calendar.json()] == [task["id"]]

    overview = client.get("/overview/summary", headers=headers).json()
    assert overview["completed_today_count"] == 1
    assert overview["today_tasks"][0]["status"] == "completed"

    report = client.get(
        "/reports/productivity",
        params={
            "start_date": today.isoformat(),
            "end_date": today.isoformat(),
            "category": "Personal",
        },
        headers=headers,
    ).json()
    assert report["completed"] == 1
    assert report["completion_percentage"] == 100


def test_whatsapp_verification_flow(client, make_user, monkeypatch):
    from sqlalchemy import select

    from app.core.database import SessionLocal
    from app.models.notification_settings import UserNotificationSettings

    headers = make_user()
    sent = {}

    def fake_send(number, template_name, **kwargs):
        sent.update(number=number, template=template_name, params=kwargs["body_params"])
        return "wamid.OTP"

    monkeypatch.setattr("app.api.whatsapp_settings.send_template", fake_send)
    connected = client.put(
        "/whatsapp/connect",
        json={"whatsapp_number": "+923001234567", "opted_in": True},
        headers=headers,
    )
    assert connected.status_code == 200
    assert connected.json()["is_verified"] is False
    assert client.post("/whatsapp/verify", headers=headers).status_code == 202
    code = sent["params"][0]
    with SessionLocal() as db:
        row = db.scalar(select(UserNotificationSettings))
        expected = hmac.new(
            settings.secret_key.encode(), code.encode(), hashlib.sha256
        ).hexdigest()
        assert row.verification_attempts == 0
        assert row.verification_code_hash == expected
        assert hmac.compare_digest(row.verification_code_hash, expected)
        assert row.verification_expires_at > datetime.now(timezone.utc)
        assert row.verification_expires_at.astimezone(timezone.utc) > datetime.now(timezone.utc)
    verified = client.post(
        "/whatsapp/verify/confirm", json={"code": code}, headers=headers
    )
    assert verified.status_code == 200, verified.text
    assert verified.json()["is_verified"] is True


def test_ai_draft_requires_confirm_before_persisting(client, make_user, monkeypatch):
    headers = make_user()
    for field, value in {
        "llm_api_url": "https://llm.example.test/v1/chat/completions",
        "llm_api_key": "test-key",
        "llm_model": "test-model",
    }.items():
        monkeypatch.setattr(settings, field, value)
    local_start = (datetime.now(ZoneInfo("Asia/Karachi")) + timedelta(days=1)).replace(
        hour=9, minute=0, second=0, microsecond=0
    )
    model_output = {
        "title": "Study Python",
        "description": None,
        "start_at": local_start.replace(tzinfo=None).isoformat(),
        "duration_minutes": 120,
        "priority": "medium",
        "category": "Study",
        "reminder_offset_minutes": 30,
        "needs_clarification": [],
    }

    class FakeResponse:
        def raise_for_status(self):
            pass

        def json(self):
            return {"choices": [{"message": {"content": json.dumps(model_output)}}]}

    monkeypatch.setattr("app.api.assistant.httpx.post", lambda *args, **kwargs: FakeResponse())
    draft = client.post(
        "/assistant/draft",
        json={"instruction": "Remind me tomorrow morning to study Python for two hours"},
        headers=headers,
    )
    assert draft.status_code == 200
    assert client.get("/tasks", headers=headers).json() == []

    saved = client.post(
        "/assistant/confirm",
        json={**draft.json()["draft"], "confirmed": True},
        headers=headers,
    )
    assert saved.status_code == 201, saved.text
    assert saved.json()["task"]["title"] == "Study Python"
    assert client.get("/tasks", headers=headers).json()[0]["title"] == "Study Python"


def test_task_local_time_rejects_dst_gap_and_ambiguity():
    from fastapi import HTTPException

    from app.api.tasks import to_utc

    for invalid_local_time in (datetime(2026, 3, 8, 2, 30), datetime(2026, 11, 1, 1, 30)):
        try:
            to_utc(invalid_local_time, "America/New_York")
        except HTTPException as exc:
            assert exc.status_code == 422
        else:
            raise AssertionError("DST gap/ambiguous time must be rejected")


def test_recurring_occurrences_are_idempotent_and_stoppable(client, make_user):
    from app.services.recurring_service import generate_recurring_tasks

    headers = make_user()
    tomorrow = datetime.now(ZoneInfo("Asia/Karachi")).date() + timedelta(days=1)
    response = client.post(
        "/recurring",
        json={
            "title": "Daily study",
            "start_date": tomorrow.isoformat(),
            "local_time": "09:00:00",
            "frequency": "daily",
            "weekdays": [],
            "end_date": (tomorrow + timedelta(days=2)).isoformat(),
            "priority": "low",
            "category": "Study",
            "reminder_offsets": [0, 15],
        },
        headers=headers,
    )
    assert response.status_code == 201, response.text
    schedule_id = response.json()["id"]
    assert len(client.get("/tasks", headers=headers).json()) == 3
    assert len(client.get("/reminders", headers=headers).json()) == 6

    generate_recurring_tasks()
    assert len(client.get("/tasks", headers=headers).json()) == 3
    assert len(client.get("/reminders", headers=headers).json()) == 6

    task = client.get("/tasks", headers=headers).json()[0]
    assert client.delete(f"/tasks/{task['id']}", headers=headers).status_code == 204
    generate_recurring_tasks()
    assert len(client.get("/tasks", headers=headers).json()) == 2

    stopped = client.post(f"/recurring/{schedule_id}/stop", headers=headers)
    assert stopped.status_code == 200
    assert stopped.json()["is_active"] is False
    assert client.get("/tasks", headers=headers).json() == []
