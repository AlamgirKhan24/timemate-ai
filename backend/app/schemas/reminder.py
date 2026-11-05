from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ReminderCreate(BaseModel):
    task_id: int
    offset_minutes: int = Field(default=0, ge=0, le=10080)


class ReminderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    task_id: int
    offset_minutes: int
    remind_at: datetime
    channel: str
    status: str
    sent_at: datetime | None
    created_at: datetime
