from datetime import datetime
from pydantic import BaseModel, ConfigDict



class NotificationLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    reminder_id: int | None
    task_title: str
    result: str
    retry_safe: bool
    error: str | None
    created_at: datetime
