from collections import defaultdict
from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.task import Task
from app.models.user import User
from app.schemas.task import Category

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/productivity")
def productivity_report(
    start_date: date | None = None,
    end_date: date | None = None,
    category: Category | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    zone = ZoneInfo(user.timezone)
    local_today = datetime.now(zone).date()
    start_day = start_date or (local_today - timedelta(days=29))
    end_day = end_date or local_today
    if end_day < start_day:
        raise HTTPException(status_code=400, detail="end_date must be on or after start_date")
    start_at = datetime.combine(start_day, time.min, tzinfo=zone).astimezone(timezone.utc)
    end_at = datetime.combine(
        end_day + timedelta(days=1), time.min, tzinfo=zone
    ).astimezone(timezone.utc)
    query = select(Task).where(
        Task.user_id == user.id,
        Task.status != "cancelled",
        Task.start_at >= start_at,
        Task.start_at < end_at,
    )
    if category:
        query = query.where(Task.category == category)
    rows = db.scalars(query.order_by(Task.start_at)).all()
    now = datetime.now(timezone.utc)
    completed = sum(task.status == "completed" for task in rows)
    def utc_start(task):
        return task.start_at.replace(tzinfo=timezone.utc) if task.start_at.tzinfo is None else task.start_at.astimezone(timezone.utc)

    pending = sum(task.status == "pending" and utc_start(task) >= now for task in rows)
    overdue = sum(task.status == "pending" and utc_start(task) < now for task in rows)
    total = len(rows)

    weekly = defaultdict(list)
    monthly = defaultdict(list)
    for task in rows:
        start = task.start_at
        if start.tzinfo is None:
            start = start.replace(tzinfo=timezone.utc)
        local_day = start.astimezone(zone).date()
        iso = local_day.isocalendar()
        weekly[f"{iso.year}-W{iso.week:02d}"].append(task)
        monthly[local_day.strftime("%Y-%m")].append(task)

    def summarize(grouped):
        summaries = []
        for period, tasks in sorted(grouped.items()):
            count = len(tasks)
            done = sum(task.status == "completed" for task in tasks)
            summaries.append(
                {
                    "period": period,
                    "completed": done,
                    "total": count,
                    "completion_percentage": round(done / count * 100, 1) if count else 0,
                }
            )
        return summaries

    return {
        "start_date": start_day.isoformat(),
        "end_date": end_day.isoformat(),
        "category": category,
        "completed": completed,
        "pending": pending,
        "overdue": overdue,
        "total": total,
        "completion_percentage": round(completed / total * 100, 1) if total else 0,
        "weekly": summarize(weekly),
        "monthly": summarize(monthly),
    }
