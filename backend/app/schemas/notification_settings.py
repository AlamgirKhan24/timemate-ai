from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class WhatsAppConnect(BaseModel):
    whatsapp_number: str = Field(pattern=r"^\+[1-9]\d{7,14}$")
    opted_in: bool


class WhatsAppVerify(BaseModel):
    code: str = Field(pattern=r"^\d{6}$")


class NotificationSettingsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    whatsapp_number: str | None
    is_verified: bool
    opted_in: bool
    opted_in_at: datetime | None
