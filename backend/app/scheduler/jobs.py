from apscheduler.schedulers.background import BackgroundScheduler

from app.services.reminder_service import process_due_reminders

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
    scheduler.start()


def stop_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
