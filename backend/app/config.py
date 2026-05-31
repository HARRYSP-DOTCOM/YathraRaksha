import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "YatraRaksha API"
    api_prefix: str = "/v1"
    secret_key: str = "dev-change-me-in-production-use-openssl-rand"
    algorithm: str = "HS256"
    access_token_expire_seconds: int = 86400
    database_url: str = "sqlite:///./yatra_raksha.db"
    cors_origins: str = "*"
    allow_credentials: bool = False
    media_upload_dir: str = "uploads"
    groq_api_key: str = ""
    groq_model: str = "meta-llama/llama-4-maverick-17b-128e-instruct"
    groq_vision_model: str = "meta-llama/llama-4-scout-17b-16e-instruct"
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-3-5-sonnet-latest"
    open_roads_data_url: str = ""
    open_data_refresh_on_startup: bool = False

    def __init__(self, **values):
        super().__init__(**values)
        # Vercel-specific overrides for ephemeral/read-only filesystem
        if os.environ.get("VERCEL"):
            if self.database_url == "sqlite:///./yatra_raksha.db":
                self.database_url = "sqlite:////tmp/yatra_raksha.db"
            if self.media_upload_dir == "uploads":
                self.media_upload_dir = "/tmp/uploads"


settings = Settings()
