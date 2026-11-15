from datetime import datetime

from datetime import date

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Task(Base):
    __tablename__ = "tasks"
    __table_args__ = (
        UniqueConstraint(
            "recurring_schedule_id", "occurrence_date", name="uq_task_recurrence_occurrence"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    start_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    priority: Mapped[str] = mapped_column(String(10), default="medium")
    category: Mapped[str] = mapped_column(String(50), default="Personal")
    status: Mapped[str] = mapped_column(String(20), default="pending")
    recurring_schedule_id: Mapped[int | None] = mapped_column(
        ForeignKey("recurring_schedules.id", ondelete="SET NULL"), nullable=True, index=True
    )
    occurrence_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
