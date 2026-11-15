from datetime import date, time
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.schemas.task import Category, Priority


class RecurringScheduleInput(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    start_date: date
    local_time: time
    frequency: Literal["daily", "weekly", "selected_days"]
    weekdays: list[int] = Field(default_factory=list, max_length=7)
    end_date: date | None = None
    duration_minutes: int | None = Field(default=None, gt=0, le=1440)
    priority: Priority = "medium"
    category: Category = "Personal"
    reminder_offsets: list[int] = Field(default_factory=list, max_length=5)

    @field_validator("local_time")
    @classmethod
    def time_must_be_local(cls, value: time) -> time:
        if value.tzinfo is not None:
            raise ValueError("local_time must not include a timezone offset")
        return value

    @model_validator(mode="after")
    def validate_schedule(self):
        if self.end_date is not None and self.end_date < self.start_date:
            raise ValueError("end_date must be on or after start_date")
        if any(day < 0 or day > 6 for day in self.weekdays):
            raise ValueError("weekdays must use 0 for Monday through 6 for Sunday")
        if len(set(self.weekdays)) != len(self.weekdays):
            raise ValueError("weekdays cannot contain duplicates")
        if self.frequency in {"weekly", "selected_days"} and not self.weekdays:
            raise ValueError("Select at least one weekday for this schedule")
        if self.frequency == "daily" and self.weekdays:
            raise ValueError("Daily schedules do not use weekdays")
        if any(offset < 0 or offset > 10080 for offset in self.reminder_offsets):
            raise ValueError("Reminder offsets must be between 0 and 10080 minutes")
        if len(set(self.reminder_offsets)) != len(self.reminder_offsets):
            raise ValueError("Reminder offsets cannot contain duplicates")
        return self


class RecurringScheduleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str | None
    start_date: date
    local_time: time
    timezone: str
    frequency: str
    weekdays: list[int]
    end_date: date | None
    duration_minutes: int | None
    priority: str
    category: str
    reminder_offsets: list[int]
    is_active: bool
