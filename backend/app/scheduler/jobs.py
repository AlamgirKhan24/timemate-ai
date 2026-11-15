from datetime import datetime, timezone

from apscheduler.schedulers.background import BackgroundScheduler

from app.services.reminder_service import process_due_reminders
from app.services.recurring_service import generate_recurring_tasks

scheduler = BackgroundScheduler(timezone="UTC")


def start_scheduler() -> None:
    if scheduler.running:
        return
    scheduler.add_job(
        process_due_reminders,
        "interval",
        minutes=1,
        id="process_due_reminders",
        max_instances=1,
        coalesce=True,
        replace_existing=True,
    )
    scheduler.add_job(
        generate_recurring_tasks,
        "interval",
        hours=1,
        id="generate_recurring_tasks",
        max_instances=1,
        coalesce=True,
        replace_existing=True,
        next_run_time=datetime.now(timezone.utc),
    )
    scheduler.start()


def stop_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
