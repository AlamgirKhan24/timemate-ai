from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import select

from app.core.database import SessionLocal
from app.models.notification_log import NotificationLog
from app.models.notification_settings import UserNotificationSettings
from app.models.reminder import Reminder
from app.services.reminder_service import process_due_reminders


@pytest.fixture
def sent(monkeypatch):
    calls = []

    def fake_send(to, *args, **kwargs):
        calls.append(to)
        return "wamid.TEST"

    monkeypatch.setattr("app.services.reminder_service.send_template", fake_send)
    return calls


def make_reminder(client, headers, minutes_ago=1, number="923001234567", opted_in=True, completed=False):
    """Create a task through the API, then a reminder that is due `minutes_ago` minutes ago."""
    user_id = client.get("/users/me", headers=headers).json()["id"]
    start = (datetime.now(timezone.utc) + timedelta(hours=24)).strftime("%Y-%m-%dT%H:%M:%S")
    r = client.post("/tasks", json={"title": "Study", "start_at": start}, headers=headers)
    assert r.status_code == 201, r.text
    task_id = r.json()["id"]
    if completed:
        client.put(f"/tasks/{task_id}", json={"status": "completed"}, headers=headers)

    with SessionLocal() as db:
        if number:
            db.add(UserNotificationSettings(user_id=user_id, whatsapp_number=number, opted_in=opted_in))
        reminder = Reminder(
            task_id=task_id,
            offset_minutes=0,
            remind_at=datetime.now(timezone.utc) - timedelta(minutes=minutes_ago),
        )
        db.add(reminder)
        db.commit()
        return reminder.id, task_id


def reminder_status(reminder_id):
    with SessionLocal() as db:
        r = db.get(Reminder, reminder_id)
        return None if r is None else r.status


def log_rows(reminder_id):
    with SessionLocal() as db:
        rows = db.scalars(select(NotificationLog).where(NotificationLog.reminder_id == reminder_id)).all()
        return [(row.result, row.error) for row in rows]


def test_due_reminder_is_sent_exactly_once(client, make_user, sent):
    headers = make_user()
    rid, _ = make_reminder(client, headers)

    process_due_reminders()
    process_due_reminders()  # the scheduler checks the same reminder again

    assert sent == ["923001234567"]
    assert reminder_status(rid) == "sent"
    assert log_rows(rid) == [("sent", None)]


def test_reminder_not_due_yet_stays_pending(client, make_user, sent):
    headers = make_user()
    rid, _ = make_reminder(client, headers, minutes_ago=-30)

    process_due_reminders()

    assert sent == []
    assert reminder_status(rid) == "pending"


def test_completed_task_is_skipped(client, make_user, sent):
    headers = make_user()
    rid, _ = make_reminder(client, headers, completed=True)

    process_due_reminders()

    assert sent == []
    assert reminder_status(rid) == "skipped"


def test_user_without_opt_in_gets_nothing(client, make_user, sent):
    headers = make_user()
    rid, _ = make_reminder(client, headers, opted_in=False)

    process_due_reminders()

    assert sent == []
    assert reminder_status(rid) == "skipped"


def test_user_without_whatsapp_number_gets_nothing(client, make_user, sent):
    headers = make_user()
    rid, _ = make_reminder(client, headers, number=None)

    process_due_reminders()

    assert sent == []
    assert reminder_status(rid) == "skipped"


def test_very_late_reminder_is_marked_missed(client, make_user, sent):
    headers = make_user()
    rid, _ = make_reminder(client, headers, minutes_ago=120)

    process_due_reminders()

    assert sent == []
    assert reminder_status(rid) == "missed"


def test_failed_send_is_recorded(client, make_user, monkeypatch):
    def broken_send(*args, **kwargs):
        raise RuntimeError("WhatsApp is down")

    monkeypatch.setattr("app.services.reminder_service.send_template", broken_send)
    headers = make_user()
    rid, _ = make_reminder(client, headers)

    process_due_reminders()

    assert reminder_status(rid) == "failed"
    rows = log_rows(rid)
    assert rows[0][0] == "failed"
    assert "WhatsApp is down" in rows[0][1]


def test_deleting_a_task_removes_its_reminders(client, make_user, sent):
    headers = make_user()
    rid, task_id = make_reminder(client, headers)

    assert client.delete(f"/tasks/{task_id}", headers=headers).status_code == 204
    process_due_reminders()

    assert reminder_status(rid) is None
    assert sent == []