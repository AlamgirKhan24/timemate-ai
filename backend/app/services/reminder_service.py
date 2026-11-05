import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.core.database import SessionLocal
from app.integrations.whatsapp import send_template
from app.models.notification_log import NotificationLog
from app.models.notification_settings import UserNotificationSettings
from app.models.reminder import Reminder
from app.models.task import Task

logger = logging.getLogger("timemate.reminders")

GRACE_MINUTES = 60


def add_log(db, reminder, task, result, message_id=None, error=None):
    db.add(
        NotificationLog(
            user_id=task.user_id,
            reminder_id=reminder.id,
            task_title=task.title,
            provider_message_id=message_id,
            result=result,
            error=error,
        )
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
                add_log(db, reminder, task, "skipped", error="Task already completed")
                continue

            if reminder.remind_at < now - timedelta(minutes=GRACE_MINUTES):
                reminder.status = "missed"
                add_log(db, reminder, task, "missed", error="Reminder was too late to send")
                continue

            settings_row = db.scalar(
                select(UserNotificationSettings).where(
                    UserNotificationSettings.user_id == task.user_id
                )
            )
            if not settings_row or not settings_row.opted_in or not settings_row.whatsapp_number:
                reminder.status = "skipped"
                add_log(db, reminder, task, "skipped", error="No opted-in WhatsApp number")
                print(f"[REMINDER SKIPPED] id={reminder.id}: no opted-in number", flush=True)
                continue

            try:
                message_id = send_template(settings_row.whatsapp_number)
                reminder.status = "sent"
                reminder.sent_at = now
                add_log(db, reminder, task, "sent", message_id=message_id)
                print(
                    f"[REMINDER SENT] task='{task.title}' reminder id={reminder.id} "
                    f"message id={message_id}",
                    flush=True,
                )
            except Exception as exc:
                logger.error("Failed to send reminder %s: %s", reminder.id, exc)
                print(f"[REMINDER FAILED] id={reminder.id}: {exc}", flush=True)
                reminder.status = "failed"
                add_log(db, reminder, task, "failed", error=str(exc)[:500])

        db.commit()
    except Exception:
        db.rollback()
        logger.exception("Reminder check failed")
    finally:
        db.close()
