from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "财经可视化大屏"
    database_url: str = "sqlite+aiosqlite:///./dashboard.db"
    debug: bool = True


settings = Settings()
