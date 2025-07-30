import os
from typing import Any, Dict, Optional, List
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://user:password@localhost:5433/cash_management",
        description="Database connection URL",
    )

    # Security
    SECRET_KEY: str = Field(
        default="your-super-secret-key-change-this-in-production",
        description="Secret key for JWT tokens",
    )
    ALGORITHM: str = Field(default="HS256", description="JWT algorithm")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(
        default=30, description="Access token expiration in minutes"
    )
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(
        default=7, description="Refresh token expiration in days"
    )

    # CORS
    FRONTEND_URL: str = Field(
        default="http://localhost:3001", description="Frontend URL"
    )
    BACKEND_CORS_ORIGINS: List[str] = Field(
        default=[
            "http://localhost:3001",
            "http://127.0.0.1:3001",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://172.23.0.4:5173",
            "http://172.23.0.4:3001",
        ],
        description="Allowed CORS origins",
    )

    # Development
    DEBUG: bool = Field(default=True, description="Debug mode")
    LOG_LEVEL: str = Field(default="INFO", description="Logging level")

    # Rate Limiting
    RATE_LIMIT_REQUESTS: int = Field(default=100, description="Rate limit requests")
    RATE_LIMIT_WINDOW: int = Field(
        default=60, description="Rate limit window in seconds"
    )

    model_config = {
        "env_file": ".env",
        "case_sensitive": True,
    }


settings = Settings()
