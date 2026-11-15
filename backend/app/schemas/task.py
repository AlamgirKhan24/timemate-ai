from datetime import date, datetime, timezone
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

Priority = Literal["high", "medium", "low"]
Category = Literal["Study", "Work", "Personal", "Health"]
Status = Literal["pending", "completed"]


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    start_at: datetime
    duration_minutes: int | None = Field(default=None, gt=0, le=1440)
    priority: Priority = "medium"
    category: Category = "Personal"


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    start_at: datetime | None = None
    duration_minutes: int | None = Field(default=None, gt=0, le=1440)
    priority: Priority | None = None
    category: Category | None = None
    status: Status | None = None


class TaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="before")
    @classmethod
    def expose_overdue_state(cls, value):
        if getattr(value, "status", None) == "pending":
            start_at = getattr(value, "start_at", None)
            if start_at is not None:
                if start_at.tzinfo is None:
                    start_at = start_at.replace(tzinfo=timezone.utc)
                if start_at < datetime.now(timezone.utc):
                    return {
                        "id": value.id,
                        "title": value.title,
                        "description": value.description,
                        "start_at": value.start_at,
                        "duration_minutes": value.duration_minutes,
                        "priority": value.priority,
                        "category": value.category,
                        "status": "overdue",
                        "created_at": value.created_at,
                        "updated_at": value.updated_at,
                        "recurring_schedule_id": value.recurring_schedule_id,
                        "occurrence_date": value.occurrence_date,
                    }
        return value

    id: int
    title: str
    description: str | None
    start_at: datetime
    duration_minutes: int | None
    priority: str
    category: str
    status: str
    created_at: datetime
    updated_at: datetime
    recurring_schedule_id: int | None = None
    occurrence_date: date | None = None
