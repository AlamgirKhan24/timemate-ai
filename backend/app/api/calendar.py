from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.tasks import calendar_tasks
from app.core.database import get_db
from app.models.user import User
from app.schemas.task import TaskOut

router = APIRouter(prefix="/calendar", tags=["calendar"])


@router.get("", response_model=list[TaskOut])
def get_calendar(
    start: datetime,
    end: datetime,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return calendar_tasks(start=start, end=end, db=db, user=user)
