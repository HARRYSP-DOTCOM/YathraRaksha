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
    groq_model: str = "llama-3.3-70b-versatile"
    open_roads_data_url: str = ""
    open_data_refresh_on_startup: bool = False


settings = Settings()
