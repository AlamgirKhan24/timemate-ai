from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.reminder import Reminder
from app.models.task import Task
from app.models.user import User
from app.schemas.task import TaskCreate, TaskOut, TaskUpdate

router = APIRouter(prefix="/tasks", tags=["tasks"])


def to_utc(value: datetime, tz_name: str) -> datetime:
    if value.tzinfo is None:
        value = value.replace(tzinfo=ZoneInfo(tz_name))
    return value.astimezone(timezone.utc)


def get_own_task(task_id: int, user: User, db: Session) -> Task:
    task = db.scalar(select(Task).where(Task.id == task_id, Task.user_id == user.id))
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


def reschedule_reminders(task: Task, db: Session) -> None:
    start_at = task.start_at
    if start_at.tzinfo is None:
        start_at = start_at.replace(tzinfo=timezone.utc)
    now = datetime.now(timezone.utc)

    reminders = db.scalars(select(Reminder).where(Reminder.task_id == task.id)).all()
    for reminder in reminders:
        reminder.remind_at = start_at - timedelta(minutes=reminder.offset_minutes)
        if reminder.remind_at > now:
            reminder.status = "pending"
            reminder.sent_at = None


@router.post("", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
def create_task(
    data: TaskCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    task = Task(
        **data.model_dump(exclude={"start_at"}),
        start_at=to_utc(data.start_at, user.timezone),
        user_id=user.id,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.get("", response_model=list[TaskOut])
def list_tasks(
    start: datetime | None = None,
    end: datetime | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = select(Task).where(Task.user_id == user.id)
    if start:
        query = query.where(Task.start_at >= to_utc(start, user.timezone))
    if end:
        query = query.where(Task.start_at <= to_utc(end, user.timezone))
    return db.scalars(query.order_by(Task.start_at)).all()


@router.get("/{task_id}", response_model=TaskOut)
def read_task(
    task_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return get_own_task(task_id, user, db)


@router.put("/{task_id}", response_model=TaskOut)
def update_task(
    task_id: int,
    data: TaskUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    task = get_own_task(task_id, user, db)
    changes = data.model_dump(exclude_unset=True)
    time_changed = False
    if "start_at" in changes and changes["start_at"] is not None:
        changes["start_at"] = to_utc(changes["start_at"], user.timezone)
        time_changed = True
    for field, value in changes.items():
        if value is None and field in ("title", "start_at", "priority", "category", "status"):
            continue
        setattr(task, field, value)
    if time_changed:
        db.flush()
        reschedule_reminders(task, db)
    db.commit()
    db.refresh(task)
    return task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    db.delete(get_own_task(task_id, user, db))
    db.commit()