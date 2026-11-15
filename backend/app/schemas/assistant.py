from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.task import Category, Priority


class AssistantDraftRequest(BaseModel):
    instruction: str = Field(min_length=3, max_length=1500)


class AssistantDraft(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    start_at: datetime | None = None
    duration_minutes: int | None = Field(default=None, gt=0, le=1440)
    priority: Priority = "medium"
    category: Category = "Personal"
    reminder_offset_minutes: int | None = Field(default=None, ge=0, le=10080)
    needs_clarification: list[str] = Field(default_factory=list, max_length=5)


class AssistantConfirmRequest(AssistantDraft):
    confirmed: Literal[True]


class DailyPlanRequest(BaseModel):
    day: date | None = None
    available_minutes: int = Field(ge=1, le=1440)
    confirm_share_task_details: Literal[True]
