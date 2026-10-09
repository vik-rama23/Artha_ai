from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str

    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60

    recurring_scheduler_enabled: bool = True
    recurring_scheduler_interval_seconds: int = 3600

    # OpenAI is optional at application startup. The AI endpoint returns
    # a clear configuration error until OPENAI_API_KEY is provided.
    openai_api_key: str | None = None
    openai_model: str = "gpt-5-mini"
    openai_timeout_seconds: float = 30.0

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
    )


settings = Settings()
