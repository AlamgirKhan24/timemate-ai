from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.notification_settings import UserNotificationSettings
from app.models.user import User
from app.schemas.notification_settings import NotificationSettingsOut, WhatsAppConnect

router = APIRouter(prefix="/whatsapp", tags=["whatsapp"])


def get_or_create(user: User, db: Session) -> UserNotificationSettings:
    row = db.scalar(
        select(UserNotificationSettings).where(UserNotificationSettings.user_id == user.id)
    )
    if not row:
        row = UserNotificationSettings(user_id=user.id)
        db.add(row)
        db.flush()
    return row


@router.get("/settings", response_model=NotificationSettingsOut)
def read_settings(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    row = get_or_create(user, db)
    db.commit()
    db.refresh(row)
    return row


@router.put("/connect", response_model=NotificationSettingsOut)
def connect(
    data: WhatsAppConnect,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not data.opted_in:
        raise HTTPException(
            status_code=400, detail="You must agree to receive WhatsApp reminders"
        )
    row = get_or_create(user, db)
    if row.whatsapp_number != data.whatsapp_number:
        row.is_verified = False
    row.whatsapp_number = data.whatsapp_number
    row.opted_in = True
    row.opted_in_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/disconnect", status_code=status.HTTP_204_NO_CONTENT)
def disconnect(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    row = get_or_create(user, db)
    row.whatsapp_number = None
    row.is_verified = False
    row.opted_in = False
    row.opted_in_at = None
    db.commit()
