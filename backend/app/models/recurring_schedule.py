from datetime import date, datetime, time

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, JSON, String, Text, Time, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class RecurringSchedule(Base):
    __tablename__ = "recurring_schedules"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    start_date: Mapped[date] = mapped_column(Date)
    local_time: Mapped[time] = mapped_column(Time)
    timezone: Mapped[str] = mapped_column(String(64))
    frequency: Mapped[str] = mapped_column(String(20))
    weekdays: Mapped[list[int]] = mapped_column(JSON, default=list)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    priority: Mapped[str] = mapped_column(String(10), default="medium")
    category: Mapped[str] = mapped_column(String(50), default="Personal")
    reminder_offsets: Mapped[list[int]] = mapped_column(JSON, default=list)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
