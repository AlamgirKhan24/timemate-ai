import logging
from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

from sqlalchemy import select

from app.core.database import SessionLocal
from app.models.recurring_schedule import RecurringSchedule
from app.models.reminder import Reminder
from app.models.task import Task

logger = logging.getLogger("timemate.recurring")
GENERATION_DAYS = 30


def _matches(schedule: RecurringSchedule, day: date) -> bool:
    if day < schedule.start_date or (schedule.end_date and day > schedule.end_date):
        return False
    if schedule.frequency == "daily":
        return True
    return day.weekday() in (schedule.weekdays or [])


def _local_occurrence(day: date, local_time: time, zone: ZoneInfo):
    naive = datetime.combine(day, local_time)
    value = naive.replace(tzinfo=zone, fold=0)
    if value.astimezone(timezone.utc).astimezone(zone).replace(tzinfo=None) != naive:
        return None
    return value.astimezone(timezone.utc)


def generate_schedule_occurrences(db, schedule: RecurringSchedule, *, now=None) -> int:
    if not schedule.is_active:
        return 0
    now = now or datetime.now(timezone.utc)
    zone = ZoneInfo(schedule.timezone)
    local_today = now.astimezone(zone).date()
    first_day = max(schedule.start_date, local_today)
    last_day = local_today + timedelta(days=GENERATION_DAYS)
    if schedule.end_date:
        last_day = min(last_day, schedule.end_date)
    if first_day > last_day:
        return 0

    existing = set(
        db.scalars(
            select(Task.occurrence_date).where(
                Task.recurring_schedule_id == schedule.id,
                Task.occurrence_date >= first_day,
                Task.occurrence_date <= last_day,
            )
        ).all()
    )
    created = 0
    day = first_day
    while day <= last_day:
        if day not in existing and _matches(schedule, day):
            start_at = _local_occurrence(day, schedule.local_time, zone)
            if start_at and start_at >= now - timedelta(minutes=60):
                task = Task(
                    user_id=schedule.user_id,
                    title=schedule.title,
                    description=schedule.description,
                    start_at=start_at,
                    duration_minutes=schedule.duration_minutes,
                    priority=schedule.priority,
                    category=schedule.category,
                    status="pending",
                    recurring_schedule_id=schedule.id,
                    occurrence_date=day,
                )
                db.add(task)
                db.flush()
                for offset in schedule.reminder_offsets or []:
                    db.add(
                        Reminder(
                            task_id=task.id,
                            offset_minutes=offset,
                            remind_at=start_at - timedelta(minutes=offset),
                            channel="whatsapp",
                            status="pending",
                        )
                    )
                created += 1
        day += timedelta(days=1)
    return created


def generate_recurring_tasks() -> None:
    with SessionLocal() as db:
        schedules = db.scalars(
            select(RecurringSchedule)
            .where(RecurringSchedule.is_active.is_(True))
            .with_for_update(skip_locked=True)
        ).all()
        try:
            for schedule in schedules:
                generate_schedule_occurrences(db, schedule)
            db.commit()
        except Exception:
            db.rollback()
            logger.exception("Could not generate recurring task occurrences")
