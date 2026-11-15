from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

ENV_FILE = Path(__file__).resolve().parents[3] / ".env"


class Settings(BaseSettings):
    database_url: str
    secret_key: str
    access_token_expire_minutes: int = 60
    whatsapp_token: str = ""
    whatsapp_phone_number_id: str = ""
    whatsapp_verify_token: str = ""
    whatsapp_app_secret: str = ""
    whatsapp_reminder_template: str = "timemate_reminder"
    whatsapp_otp_template: str = "timemate_verify"
    whatsapp_template_language: str = "en_US"
    whatsapp_graph_version: str = "v27.0"
    whatsapp_verification_code_minutes: int = 10
    llm_api_url: str = ""
    llm_transcription_url: str = ""
    llm_transcription_model: str = ""
    llm_api_key: str = ""
    llm_model: str = ""
    whatsapp_test_recipient: str = ""

    model_config = SettingsConfigDict(env_file=ENV_FILE, extra="ignore")


settings = Settings()
