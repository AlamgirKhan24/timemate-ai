import json
from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

import httpx
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.api.tasks import to_utc
from app.core.config import settings
from app.core.database import get_db
from app.models.reminder import Reminder
from app.models.task import Task
from app.models.user import User
from app.schemas.assistant import AssistantConfirmRequest, AssistantDraft, AssistantDraftRequest, DailyPlanRequest
from app.schemas.task import TaskOut

router = APIRouter(prefix="/assistant", tags=["AI assistant"])
MAX_AUDIO_BYTES = 20 * 1024 * 1024


def _llm_json(system: str, user_content: str) -> dict:
    missing = [
        name
        for name, value in (
            ("LLM_API_URL", settings.llm_api_url),
            ("LLM_API_KEY", settings.llm_api_key),
            ("LLM_MODEL", settings.llm_model),
        )
        if not value
    ]
    if missing:
        raise HTTPException(
            status_code=503,
            detail=(
                "AI assistant is not configured. Add these settings to the project-root "
                f".env file: {', '.join(missing)}. Restart the backend after saving."
            ),
        )
    try:
        response = httpx.post(
            settings.llm_api_url,
            json={
                "model": settings.llm_model,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user_content},
                ],
                "response_format": {"type": "json_object"},
            },
            headers={"Authorization": f"Bearer {settings.llm_api_key}"},
            timeout=30,
        )
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"]
        result = json.loads(content)
        if not isinstance(result, dict):
            raise ValueError("Expected a JSON object")
        return result
    except httpx.HTTPStatusError as exc:
        status_code = exc.response.status_code
        if status_code in (401, 403):
            reason = "authentication or model access was rejected; check LLM_API_KEY and LLM_MODEL"
        elif status_code == 429:
            try:
                provider_error = exc.response.json().get("error", {})
                provider_code = str(provider_error.get("code") or provider_error.get("type") or "")
            except (ValueError, AttributeError):
                provider_code = ""
            if provider_code in {
                "insufficient_quota",
                "credit_balance_exhausted",
                "organization_usage_limit_exceeded",
                "organization_spend_limit_exceeded",
                "project_spend_limit_exceeded",
            }:
                reason = (
                    "the API account or project has no available quota/credits, or reached its "
                    "spending limit; check API billing, credits, and project limits"
                )
            elif provider_code in {"rate_limit_exceeded", "requests", "tokens"}:
                reason = "the temporary request or token rate limit was reached; wait and retry more slowly"
            else:
                reason = (
                    "the API account quota, spending limit, or temporary rate limit was reached; "
                    "check API billing and usage limits"
                )
        elif status_code == 400:
            reason = "the provider rejected the request; check LLM_API_URL and model support for JSON mode"
        else:
            reason = "the provider rejected the request; check its status and configuration"
        raise HTTPException(
            status_code=502,
            detail=f"AI provider request failed (HTTP {status_code}): {reason}.",
        ) from exc
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=502,
            detail="Could not connect to the AI provider. Check LLM_API_URL and backend network access.",
        ) from exc
    except (KeyError, IndexError, TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=502,
            detail="AI provider responded, but the response was not valid chat-completions JSON. Check LLM_API_URL.",
        ) from exc


@router.post("/draft")
def create_draft(
    data: AssistantDraftRequest, user: User = Depends(get_current_user)
):
    system = (
        "Extract one proposed task from the user's instruction. Return only a JSON object with keys "
        "title, description, start_at, duration_minutes, priority, category, "
        "reminder_offset_minutes, needs_clarification. Use ISO local date-time without an offset "
        f"for start_at in the user's IANA timezone {user.timezone}. Resolve relative dates from "
        "the current date supplied. If date or time is missing or ambiguous, list a short question "
        "in needs_clarification and do not invent it. priority must be high, medium, or low; "
        "category must be Study, Work, Personal, or Health. reminder_offset_minutes is null when "
        "no reminder was requested."
    )
    try:
        raw = _llm_json(
            system,
            f"Current local date: {datetime.now(ZoneInfo(user.timezone)).date().isoformat()}\nInstruction: {data.instruction}",
        )
        draft = AssistantDraft.model_validate(raw)
    except ValueError as exc:
        raise HTTPException(status_code=502, detail="AI provider could not create a valid task draft") from exc
    return {"timezone": user.timezone, "draft": draft}


@router.post("/transcribe")
async def transcribe_audio(
    audio: UploadFile = File(...),
    confirm_audio_sharing: bool = Form(...),
    user: User = Depends(get_current_user),
):
    if not confirm_audio_sharing:
        raise HTTPException(status_code=400, detail="Confirm that you want to share this audio with the configured AI provider")
    transcription_model = settings.llm_transcription_model or settings.llm_model
    missing = [
        name
        for name, value in (
            ("LLM_TRANSCRIPTION_URL", settings.llm_transcription_url),
            ("LLM_API_KEY", settings.llm_api_key),
            ("LLM_TRANSCRIPTION_MODEL or LLM_MODEL", transcription_model),
        )
        if not value
    ]
    if missing:
        raise HTTPException(
            status_code=503,
            detail=(
                "AI transcription is not configured. Add these settings to the project-root "
                f".env file: {', '.join(missing)}. Restart the backend after saving."
            ),
        )
    content = await audio.read(MAX_AUDIO_BYTES + 1)
    if not content or len(content) > MAX_AUDIO_BYTES:
        raise HTTPException(status_code=413, detail="Audio must be between 1 byte and 20 MB")
    try:
        response = httpx.post(
            settings.llm_transcription_url,
            data={"model": transcription_model},
            files={"file": (audio.filename or "audio", content, audio.content_type or "application/octet-stream")},
            headers={"Authorization": f"Bearer {settings.llm_api_key}"},
            timeout=60,
        )
        response.raise_for_status()
        transcript = response.json().get("text")
        if not isinstance(transcript, str) or not transcript.strip():
            raise ValueError("Provider returned no transcript")
    except (httpx.HTTPError, ValueError, TypeError) as exc:
        raise HTTPException(status_code=502, detail="AI provider could not transcribe the audio") from exc
    finally:
        await audio.close()
    return {"transcript": transcript, "timezone": user.timezone}


@router.post("/confirm", status_code=status.HTTP_201_CREATED)
def confirm_draft(
    data: AssistantConfirmRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if data.needs_clarification:
        raise HTTPException(status_code=422, detail="Resolve the draft questions before saving")
    if data.start_at is None:
        raise HTTPException(status_code=422, detail="The draft must include a confirmed date and time")
    task = Task(
        user_id=user.id,
        title=data.title,
        description=data.description,
        start_at=to_utc(data.start_at, user.timezone),
        duration_minutes=data.duration_minutes,
        priority=data.priority,
        category=data.category,
        status="pending",
    )
    db.add(task)
    db.flush()
    reminder = None
    if data.reminder_offset_minutes is not None:
        remind_at = task.start_at - timedelta(minutes=data.reminder_offset_minutes)
        if remind_at <= datetime.now(timezone.utc):
            db.rollback()
            raise HTTPException(status_code=400, detail="Reminder time is already in the past")
        reminder = Reminder(
            task_id=task.id,
            offset_minutes=data.reminder_offset_minutes,
            remind_at=remind_at,
            channel="whatsapp",
            status="pending",
        )
        db.add(reminder)
    db.commit()
    db.refresh(task)
    return {"task": TaskOut.model_validate(task), "reminder_id": reminder.id if reminder else None}


@router.get("/today")
def get_tasks_today(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    from app.api.overview import get_summary

    return get_summary(db, user)


@router.post("/plan")
def suggest_daily_plan(
    data: DailyPlanRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    zone = ZoneInfo(user.timezone)
    day = data.day or datetime.now(zone).date()
    start_at = datetime.combine(day, time.min, tzinfo=zone).astimezone(timezone.utc)
    end_at = datetime.combine(day + timedelta(days=1), time.min, tzinfo=zone).astimezone(timezone.utc)
    tasks = db.scalars(
        select(Task)
        .where(
            Task.user_id == user.id,
            Task.status == "pending",
            Task.start_at >= start_at,
            Task.start_at < end_at,
        )
        .order_by(Task.priority, Task.start_at)
    ).all()
    task_data = []
    for task in tasks:
        local_start = task.start_at
        if local_start.tzinfo is None:
            local_start = local_start.replace(tzinfo=timezone.utc)
        task_data.append(
            {
                "id": task.id,
                "title": task.title,
                "category": task.category,
                "priority": task.priority,
                "duration_minutes": task.duration_minutes or 30,
                "scheduled_time": local_start.astimezone(zone).strftime("%H:%M"),
            }
        )
    raw = _llm_json(
        "Create a practical suggested plan using only the provided tasks and available time. "
        "Do not modify or delete tasks. Return a JSON object with an items array; each item "
        "must contain task_id, suggested_start, and a short reason. Include unplanned_task_ids "
        "when all tasks cannot fit. Do not invent new tasks.",
        json.dumps(
            {
                "day": day.isoformat(),
                "timezone": user.timezone,
                "available_minutes": data.available_minutes,
                "tasks": task_data,
            }
        ),
    )
    if not isinstance(raw.get("items"), list):
        raise HTTPException(status_code=502, detail="AI provider returned an invalid plan")
    return {"day": day.isoformat(), "timezone": user.timezone, "plan": raw}
