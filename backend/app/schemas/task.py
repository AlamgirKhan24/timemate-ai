from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

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
