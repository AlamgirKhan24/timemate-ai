from datetime import datetime

from pydantic import BaseModel, ConfigDict


class NotificationLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    task_title: str
    result: str
    error: str | None
    created_at: datetime
