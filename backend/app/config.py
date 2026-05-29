from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "YatraRaksha API"
    api_prefix: str = "/v1"
    secret_key: str = "dev-change-me-in-production-use-openssl-rand"
    algorithm: str = "HS256"
    access_token_expire_seconds: int = 86400
    database_url: str = "sqlite:///./yatra_raksha.db"
    cors_origins: str = "http://localhost:5500,http://127.0.0.1:5500,http://localhost:3000,http://127.0.0.1:3000,http://localhost:8080,http://127.0.0.1:8080,null"
    media_upload_dir: str = "uploads"


settings = Settings()
