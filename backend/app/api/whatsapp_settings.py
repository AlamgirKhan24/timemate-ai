import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import PlainTextResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.config import settings as app_settings
from app.integrations.whatsapp import send_template
from app.models.notification_settings import UserNotificationSettings
from app.models.notification_log import NotificationLog
from app.models.reminder import Reminder
from app.models.user import User
from app.schemas.notification_settings import NotificationSettingsOut, WhatsAppConnect, WhatsAppVerify

router = APIRouter(prefix="/whatsapp", tags=["whatsapp"])


def as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


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
        row.verification_code_hash = None
        row.verification_expires_at = None
        row.verification_attempts = 0
    row.whatsapp_number = data.whatsapp_number
    row.opted_in = True
    row.opted_in_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(row)
    return row


@router.post("/verify", status_code=status.HTTP_202_ACCEPTED)
def begin_verification(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    row = get_or_create(user, db)
    if not row.whatsapp_number or not row.opted_in:
        raise HTTPException(status_code=400, detail="Connect a number and opt in first")
    if row.verification_code_hash and row.verification_expires_at:
        active_until = row.verification_expires_at
        if as_utc(active_until) > datetime.now(timezone.utc):
            raise HTTPException(status_code=429, detail="A verification code is already active")
    code = f"{secrets.randbelow(1_000_000):06d}"
    row.verification_code_hash = hmac.new(
        app_settings.secret_key.encode(), code.encode(), hashlib.sha256
    ).hexdigest()
    row.verification_expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=app_settings.whatsapp_verification_code_minutes
    )
    row.verification_attempts = 0
    db.commit()
    try:
        send_template(
            row.whatsapp_number,
            app_settings.whatsapp_otp_template,
            body_params=[code],
        )
    except Exception as exc:
        row.verification_code_hash = None
        row.verification_expires_at = None
        db.commit()
        raise HTTPException(status_code=502, detail=f"Could not send verification code: {exc}")
    return {"message": "Verification code sent to the connected WhatsApp number"}


@router.post("/verify/confirm", response_model=NotificationSettingsOut)
def confirm_verification(
    data: WhatsAppVerify,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    row = get_or_create(user, db)
    expected = hmac.new(
        app_settings.secret_key.encode(), data.code.encode(), hashlib.sha256
    ).hexdigest()
    expires = row.verification_expires_at
    if row.verification_attempts >= 5:
        raise HTTPException(status_code=429, detail="Request a new verification code")
    if (
        not row.verification_code_hash
        or not expires
        or as_utc(expires) <= datetime.now(timezone.utc)
        or not secrets.compare_digest(row.verification_code_hash, expected)
    ):
        row.verification_attempts += 1
        db.commit()
        raise HTTPException(status_code=400, detail="Verification code is invalid or expired")
    row.is_verified = True
    row.verification_code_hash = None
    row.verification_expires_at = None
    row.verification_attempts = 0
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
    row.verification_code_hash = None
    row.verification_expires_at = None
    row.verification_attempts = 0
    db.commit()


@router.get("/webhook")
def verify_webhook(request: Request):
    mode = request.query_params.get("hub.mode")
    token = request.query_params.get("hub.verify_token")
    challenge = request.query_params.get("hub.challenge")
    if mode == "subscribe" and token and secrets.compare_digest(
        token, app_settings.whatsapp_verify_token
    ):
        return PlainTextResponse(challenge or "")
    raise HTTPException(status_code=403, detail="Webhook verification failed")


@router.post("/webhook", status_code=status.HTTP_200_OK)
async def receive_webhook(request: Request, db: Session = Depends(get_db)):
    body = await request.body()
    signature = request.headers.get("X-Hub-Signature-256", "")
    expected = "sha256=" + hmac.new(
        app_settings.whatsapp_app_secret.encode(), body, hashlib.sha256
    ).hexdigest()
    if not app_settings.whatsapp_app_secret or not hmac.compare_digest(signature, expected):
        raise HTTPException(status_code=403, detail="Invalid webhook signature")
    payload = await request.json()
    for entry in payload.get("entry", []):
        for change in entry.get("changes", []):
            for item in change.get("value", {}).get("statuses", []):
                message_id, result = item.get("id"), item.get("status")
                if not message_id or result not in {"sent", "delivered", "read", "failed"}:
                    continue
                log = db.scalar(
                    select(NotificationLog).where(
                        NotificationLog.provider_message_id == message_id
                    )
                )
                if log:
                    rank = {"processing": 0, "accepted": 1, "sent": 2, "delivered": 3, "read": 4, "failed": 3}
                    if log.result in {"delivered", "read"} or (
                        log.result == "failed" and result != "delivered" and result != "read"
                    ):
                        continue
                    if result != "failed" and rank.get(result, 0) < rank.get(log.result, 0):
                        continue
                    log.result = result
                    if result == "failed":
                        errors = item.get("errors", [])
                        log.error = str(errors)[:1000] or "WhatsApp delivery failed"
                        log.retry_safe = True
                        reminder = db.get(Reminder, log.reminder_id) if log.reminder_id else None
                        if reminder and reminder.status == "sent":
                            reminder.status = "failed"
    db.commit()
    return {"status": "ok"}
