from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.tasks import get_own_task
from app.core.database import get_db
from app.models.reminder import Reminder
from app.models.notification_log import NotificationLog
from app.models.notification_settings import UserNotificationSettings
from app.models.task import Task
from app.models.user import User
from app.schemas.reminder import ReminderCreate, ReminderOut

router = APIRouter(prefix="/reminders", tags=["reminders"])


def get_own_reminder(reminder_id: int, user: User, db: Session) -> Reminder:
    reminder = db.scalar(
        select(Reminder)
        .join(Task, Task.id == Reminder.task_id)
        .where(Reminder.id == reminder_id, Task.user_id == user.id)
    )
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    return reminder


@router.post("", response_model=ReminderOut, status_code=status.HTTP_201_CREATED)
def create_reminder(
    data: ReminderCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    task = get_own_task(data.task_id, user, db)
    if task.status == "completed":
        raise HTTPException(status_code=400, detail="Completed tasks cannot have active reminders")

    start_at = task.start_at
    if start_at.tzinfo is None:
        start_at = start_at.replace(tzinfo=timezone.utc)
    remind_at = start_at - timedelta(minutes=data.offset_minutes)

    if remind_at <= datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Reminder time is already in the past")

    duplicate = db.scalar(
        select(Reminder).where(
            Reminder.task_id == task.id,
            Reminder.offset_minutes == data.offset_minutes,
        )
    )
    if duplicate:
        raise HTTPException(status_code=409, detail="This reminder already exists for the task")

    reminder = Reminder(
        task_id=task.id,
        offset_minutes=data.offset_minutes,
        remind_at=remind_at,
    )
    db.add(reminder)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="This reminder already exists for the task") from exc
    db.refresh(reminder)
    return reminder


@router.get("", response_model=list[ReminderOut])
def list_reminders(
    task_id: int | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = (
        select(Reminder)
        .join(Task, Task.id == Reminder.task_id)
        .where(Task.user_id == user.id)
    )
    if task_id is not None:
        query = query.where(Reminder.task_id == task_id)
    return db.scalars(query.order_by(Reminder.remind_at)).all()


@router.delete("/{reminder_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_reminder(
    reminder_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    db.delete(get_own_reminder(reminder_id, user, db))
    db.commit()


@router.post("/{reminder_id}/retry", response_model=ReminderOut, status_code=status.HTTP_202_ACCEPTED)
def retry_reminder(
    reminder_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    reminder = get_own_reminder(reminder_id, user, db)
    if reminder.status != "failed":
        raise HTTPException(status_code=409, detail="Only failed reminders can be retried")
    last_attempt = db.scalar(
        select(NotificationLog)
        .where(NotificationLog.reminder_id == reminder.id)
        .order_by(NotificationLog.created_at.desc(), NotificationLog.id.desc())
    )
    if not last_attempt or not last_attempt.retry_safe:
        raise HTTPException(
            status_code=409,
            detail="The delivery result is uncertain; retry is disabled to prevent a duplicate message",
        )
    task = db.get(Task, reminder.task_id)
    if not task or task.status == "completed":
        raise HTTPException(status_code=409, detail="Completed or deleted tasks cannot be retried")
    whatsapp = db.scalar(
        select(UserNotificationSettings).where(UserNotificationSettings.user_id == user.id)
    )
    if not whatsapp or not whatsapp.opted_in or not whatsapp.is_verified or not whatsapp.whatsapp_number:
        raise HTTPException(status_code=409, detail="Connect and verify an opted-in WhatsApp number first")
    reminder.status = "pending"
    reminder.remind_at = datetime.now(timezone.utc)
    reminder.claimed_at = None
    reminder.sent_at = None
    db.commit()
    db.refresh(reminder)
    return reminder
