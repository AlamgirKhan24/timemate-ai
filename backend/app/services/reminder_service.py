import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.core.config import settings
from app.core.database import SessionLocal
from app.integrations.whatsapp import send_template
from app.models.reminder import Reminder
from app.models.task import Task

logger = logging.getLogger("timemate.reminders")

# A reminder more than this late (for example, the server was off) is marked "missed"
GRACE_MINUTES = 60


def send_reminder(reminder: Reminder, task: Task) -> None:
    # Test setup: sends Meta's hello_world template to the test recipient.
    # Later: send the user's own verified number and a custom approved template.
    message_id = send_template(settings.whatsapp_test_recipient)
    print(
        f"[REMINDER SENT] task='{task.title}' reminder id={reminder.id} "
        f"message id={message_id}",
        flush=True,
    )


def process_due_reminders() -> None:
    now = datetime.now(timezone.utc)
    db = SessionLocal()
    try:
        rows = db.execute(
            select(Reminder, Task)
            .join(Task, Task.id == Reminder.task_id)
            .where(Reminder.status == "pending", Reminder.remind_at <= now)
            .with_for_update(of=Reminder, skip_locked=True)
        ).all()

        for reminder, task in rows:
            if task.status == "completed":
                reminder.status = "skipped"
            elif reminder.remind_at < now - timedelta(minutes=GRACE_MINUTES):
                reminder.status = "missed"
            else:
                try:
                    send_reminder(reminder, task)
                    reminder.status = "sent"
                    reminder.sent_at = now
                except Exception as exc:
                    logger.error("Failed to send reminder %s: %s", reminder.id, exc)
                    print(f"[REMINDER FAILED] id={reminder.id}: {exc}", flush=True)
                    reminder.status = "failed"

        db.commit()
    except Exception:
        db.rollback()
        logger.exception("Reminder check failed")
    finally:
        db.close()
