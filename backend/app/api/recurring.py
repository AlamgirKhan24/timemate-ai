from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.recurring_schedule import RecurringSchedule
from app.models.task import Task
from app.models.user import User
from app.schemas.recurrence import RecurringScheduleInput, RecurringScheduleOut
from app.services.recurring_service import generate_schedule_occurrences

router = APIRouter(prefix="/recurring", tags=["recurring tasks"])


def get_owned_schedule(schedule_id: int, user: User, db: Session) -> RecurringSchedule:
    schedule = db.scalar(
        select(RecurringSchedule).where(
            RecurringSchedule.id == schedule_id, RecurringSchedule.user_id == user.id
        )
    )
    if not schedule:
        raise HTTPException(status_code=404, detail="Recurring schedule not found")
    return schedule


def cancel_future_occurrences(schedule: RecurringSchedule, db: Session) -> None:
    future_tasks = db.scalars(
        select(Task).where(
            Task.recurring_schedule_id == schedule.id,
            Task.status == "pending",
            Task.start_at >= datetime.now(timezone.utc),
        )
    ).all()
    for task in future_tasks:
        db.delete(task)


def apply_input(schedule: RecurringSchedule, data: RecurringScheduleInput, user: User):
    for field, value in data.model_dump().items():
        setattr(schedule, field, value)
    schedule.timezone = user.timezone


@router.post("", response_model=RecurringScheduleOut, status_code=status.HTTP_201_CREATED)
def create_schedule(
    data: RecurringScheduleInput,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    schedule = RecurringSchedule(user_id=user.id, timezone=user.timezone)
    apply_input(schedule, data, user)
    db.add(schedule)
    db.flush()
    generate_schedule_occurrences(db, schedule)
    db.commit()
    db.refresh(schedule)
    return schedule


@router.get("", response_model=list[RecurringScheduleOut])
def list_schedules(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    return db.scalars(
        select(RecurringSchedule)
        .where(RecurringSchedule.user_id == user.id)
        .order_by(RecurringSchedule.created_at.desc())
    ).all()


@router.put("/{schedule_id}", response_model=RecurringScheduleOut)
def update_schedule(
    schedule_id: int,
    data: RecurringScheduleInput,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    schedule = get_owned_schedule(schedule_id, user, db)
    cancel_future_occurrences(schedule, db)
    db.flush()
    apply_input(schedule, data, user)
    schedule.is_active = True
    generate_schedule_occurrences(db, schedule)
    db.commit()
    db.refresh(schedule)
    return schedule


@router.post("/{schedule_id}/stop", response_model=RecurringScheduleOut)
def stop_schedule(
    schedule_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    schedule = get_owned_schedule(schedule_id, user, db)
    schedule.is_active = False
    cancel_future_occurrences(schedule, db)
    db.commit()
    db.refresh(schedule)
    return schedule
