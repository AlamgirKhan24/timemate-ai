from datetime import datetime
from zoneinfo import ZoneInfo

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


def check_timezone(value: str) -> str:
    try:
        ZoneInfo(value)
    except Exception:
        raise ValueError("Unknown time zone")
    return value


class UserCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    timezone: str = "Asia/Karachi"

    @field_validator("timezone")
    @classmethod
    def valid_timezone(cls, value: str) -> str:
        return check_timezone(value)


class UserUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=100)
    timezone: str | None = None

    @field_validator("timezone")
    @classmethod
    def valid_timezone(cls, value: str | None) -> str | None:
        if value is None:
            return value
        return check_timezone(value)


class AccountDelete(BaseModel):
    password: str = Field(min_length=1, max_length=128)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: EmailStr
    timezone: str
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
