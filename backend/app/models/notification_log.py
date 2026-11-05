from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class NotificationLog(Base):
    __tablename__ = "notification_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    reminder_id: Mapped[int | None] = mapped_column(
        ForeignKey("reminders.id", ondelete="SET NULL"), nullable=True, index=True
    )
    task_title: Mapped[str] = mapped_column(String(200))
    provider_message_id: Mapped[str | None] = mapped_column(String(200), nullable=True)
    result: Mapped[str] = mapped_column(String(20), index=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
