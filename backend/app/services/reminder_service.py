import logging
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from sqlalchemy import select

from app.core.config import settings
from app.core.database import SessionLocal
from app.integrations.whatsapp import send_template
from app.models.notification_log import NotificationLog
from app.models.notification_settings import UserNotificationSettings
from app.models.reminder import Reminder
from app.models.task import Task
from app.models.user import User

logger = logging.getLogger("timemate.reminders")
GRACE_MINUTES = 60
CLAIM_TIMEOUT_MINUTES = 15
BATCH_SIZE = 100


def add_log(db, reminder, task, result, message_id=None, error=None, retry_safe=False):
    log = NotificationLog(
        user_id=task.user_id,
        reminder_id=reminder.id,
        task_title=task.title,
        provider_message_id=message_id,
        result=result,
        retry_safe=retry_safe,
        error=error,
    )
    db.add(log)
    return log


def _aware_utc(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)


def _task_message_params(task: Task, user_timezone: str) -> list[str]:
    try:
        zone = ZoneInfo(user_timezone)
    except Exception:
        zone = timezone.utc
    local_start = _aware_utc(task.start_at).astimezone(zone)
    return [task.title, local_start.strftime("%b %d, %Y"), local_start.strftime("%I:%M %p").lstrip("0")]


def _finish_attempt(
    reminder_id: int,
    log_id: int,
    *,
    result: str,
    message_id=None,
    error=None,
    retry_safe=False,
):
    with SessionLocal() as db:
        reminder = db.get(Reminder, reminder_id)
        log = db.get(NotificationLog, log_id)
        if not reminder or not log:
            return
        reminder.status = "sent" if result == "accepted" else "failed"
        reminder.sent_at = datetime.now(timezone.utc) if result == "accepted" else None
        reminder.claimed_at = None
        log.result = result
        log.provider_message_id = message_id
        log.error = error
        log.retry_safe = retry_safe
        db.commit()


def _expire_abandoned_claims(now: datetime) -> None:
    cutoff = now - timedelta(minutes=CLAIM_TIMEOUT_MINUTES)
    with SessionLocal() as db:
        abandoned = db.scalars(
            select(Reminder).where(
                Reminder.status == "processing", Reminder.claimed_at < cutoff
            )
        ).all()
        for reminder in abandoned:
            reminder.status = "failed"
            reminder.claimed_at = None
            log = db.scalar(
                select(NotificationLog)
                .where(NotificationLog.reminder_id == reminder.id, NotificationLog.result == "processing")
                .order_by(NotificationLog.created_at.desc())
            )
            if log:
                log.result = "failed"
                log.error = "Worker stopped before recording the provider result; not retried to avoid duplicate delivery"
        db.commit()


def _claim(reminder_id: int, now: datetime):
    """Commit the claim before contacting WhatsApp, preventing concurrent sends."""
    with SessionLocal() as db:
        reminder = db.scalar(
            select(Reminder)
            .where(Reminder.id == reminder_id, Reminder.status == "pending")
            .with_for_update(skip_locked=True)
        )
        if not reminder:
            return None
        task = db.get(Task, reminder.task_id)
        if not task:
            reminder.status = "skipped"
            db.commit()
            return None
        if task.status in {"completed", "cancelled"}:
            reminder.status = "skipped"
            add_log(db, reminder, task, "skipped", error="Task already completed")
            db.commit()
            return None
        scheduled = _aware_utc(reminder.remind_at)
        if scheduled < now - timedelta(minutes=GRACE_MINUTES):
            reminder.status = "missed"
            add_log(db, reminder, task, "missed", error="Reminder was too late to send")
            db.commit()
            return None
        notification_settings = db.scalar(
            select(UserNotificationSettings).where(
                UserNotificationSettings.user_id == task.user_id
            )
        )
        if (
            not notification_settings
            or not notification_settings.opted_in
            or not notification_settings.is_verified
            or not notification_settings.whatsapp_number
        ):
            reminder.status = "skipped"
            add_log(db, reminder, task, "skipped", error="No verified, opted-in WhatsApp number")
            db.commit()
            return None

        reminder.status = "processing"
        reminder.claimed_at = now
        attempt = add_log(db, reminder, task, "processing")
        db.commit()
        # Copy all provider inputs before the session closes.
        owner = db.get(User, task.user_id)
        return {
            "reminder_id": reminder.id,
            "log_id": attempt.id,
            "number": notification_settings.whatsapp_number,
            "title": task.title,
            "params": _task_message_params(task, owner.timezone if owner else "UTC"),
        }


def process_due_reminders() -> None:
    now = datetime.now(timezone.utc)
    _expire_abandoned_claims(now)
    with SessionLocal() as db:
        reminder_ids = db.scalars(
            select(Reminder.id)
            .where(Reminder.status == "pending", Reminder.remind_at <= now)
            .order_by(Reminder.remind_at)
            .limit(BATCH_SIZE)
        ).all()

    for reminder_id in reminder_ids:
        claim = _claim(reminder_id, now)
        if not claim:
            continue
        try:
            message_id = send_template(
                claim["number"],
                settings.whatsapp_reminder_template,
                body_params=claim["params"],
            )
            _finish_attempt(
                claim["reminder_id"], claim["log_id"], result="accepted", message_id=message_id
            )
        except Exception as exc:
            logger.exception("Failed to send reminder %s", claim["reminder_id"])
            _finish_attempt(
                claim["reminder_id"],
                claim["log_id"],
                result="failed",
                error=str(exc)[:1000],
                retry_safe=getattr(exc, "retry_safe", False),
            )
