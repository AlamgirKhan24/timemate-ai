from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class UserNotificationSettings(Base):
    __tablename__ = "user_notification_settings"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True
    )
    whatsapp_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    opted_in: Mapped[bool] = mapped_column(Boolean, default=False)
    opted_in_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    verification_code_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    verification_attempts: Mapped[int] = mapped_column(default=0, nullable=False)
    verification_expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
