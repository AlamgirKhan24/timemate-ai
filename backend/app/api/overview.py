from datetime import datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.task import Task
from app.models.user import User
from app.schemas.task import TaskOut

router = APIRouter(prefix="/overview", tags=["overview"])


@router.get("/summary")
def get_summary(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    zone = ZoneInfo(user.timezone)
    now = datetime.now(zone)
    today_start = datetime.combine(now.date(), time.min, tzinfo=zone).astimezone(timezone.utc)
    tomorrow_start = datetime.combine(
        now.date() + timedelta(days=1), time.min, tzinfo=zone
    ).astimezone(timezone.utc)
    week_end = datetime.combine(
        now.date() + timedelta(days=7), time.min, tzinfo=zone
    ).astimezone(timezone.utc)
    current_utc = now.astimezone(timezone.utc)

    today = db.scalars(
        select(Task)
        .where(
            Task.user_id == user.id,
            Task.status != "cancelled",
            Task.start_at >= today_start,
            Task.start_at < tomorrow_start,
        )
        .order_by(Task.start_at)
    ).all()
    overdue = db.scalars(
        select(Task)
        .where(
            Task.user_id == user.id,
            Task.status != "cancelled",
            Task.status == "pending",
            Task.start_at < current_utc,
        )
        .order_by(Task.start_at)
    ).all()
    upcoming = db.scalars(
        select(Task)
        .where(
            Task.user_id == user.id,
            Task.status != "cancelled",
            Task.status == "pending",
            Task.start_at >= current_utc,
            Task.start_at < week_end,
        )
        .order_by(Task.start_at)
    ).all()
    return {
        "timezone": user.timezone,
        "today": now.date().isoformat(),
        "today_tasks": [TaskOut.model_validate(task) for task in today],
        "overdue_tasks": [TaskOut.model_validate(task) for task in overdue],
        "upcoming_tasks": [TaskOut.model_validate(task) for task in upcoming],
        "completed_today_count": sum(task.status == "completed" for task in today),
        "pending_today_count": sum(task.status == "pending" for task in today),
        "overdue_count": len(overdue),
    }
