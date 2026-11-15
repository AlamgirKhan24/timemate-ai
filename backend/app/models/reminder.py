from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Reminder(Base):
    __tablename__ = "reminders"
    __table_args__ = (
        UniqueConstraint("task_id", "offset_minutes", name="uq_reminder_task_offset"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    task_id: Mapped[int] = mapped_column(
        ForeignKey("tasks.id", ondelete="CASCADE"), index=True
    )
    offset_minutes: Mapped[int] = mapped_column(Integer, default=0)
    remind_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    channel: Mapped[str] = mapped_column(String(20), default="whatsapp")
    status: Mapped[str] = mapped_column(String(20), default="pending", index=True)
    sent_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    claimed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
