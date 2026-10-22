from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Optional
import os
from pathlib import Path

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="allow")
    
    PROJECT_NAME: str = "CloudCode"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "cloudcode-super-secret-key-change-in-production-2026-secure-jwt")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./cloudcode.db")
    
    # Redis / Coordination
    REDIS_URL: Optional[str] = os.getenv("REDIS_URL", None)
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "*"
    ]
    
    # Execution Sandbox limits
    EXECUTION_TIMEOUT_SECONDS: int = 15
    MAX_EXECUTION_MEMORY_MB: int = 128
    MAX_OUTPUT_SIZE_BYTES: int = 64 * 1024  # 64 KB
    MAX_FILE_SIZE_BYTES: int = 10 * 1024 * 1024  # 10 MB
    
    # Storage
    STORAGE_DIR: str = os.getenv("STORAGE_DIR", "./cloudcode_storage")
    
    # Docker sandbox
    USE_DOCKER_SANDBOX: bool = os.getenv("USE_DOCKER_SANDBOX", "false").lower() in ("true", "1", "yes")
    DOCKER_PYTHON_IMAGE: str = "python:3.11-slim"
    DOCKER_NODE_IMAGE: str = "node:20-alpine"
    DOCKER_CPP_IMAGE: str = "gcc:latest"

settings = Settings()

# Ensure storage directory exists
Path(settings.STORAGE_DIR).mkdir(parents=True, exist_ok=True)
