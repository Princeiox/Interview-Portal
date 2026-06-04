import os
from dotenv import load_dotenv

load_dotenv()


def _parse_csv(value: str) -> list[str]:
    """Split a comma-separated string into a list of trimmed, non-empty strings."""
    return [item.strip() for item in value.split(",") if item.strip()]


def _build_cors_origins() -> list[str]:
    """
    Build the CORS origins list.

    Priority:
      1. If BACKEND_CORS_ORIGINS env var is set, use it (comma-separated).
      2. Otherwise, derive origins from FRONTEND_URL so you only change one value.
    """
    explicit = os.getenv("BACKEND_CORS_ORIGINS")
    if explicit:
        return _parse_csv(explicit)

    # Derive from FRONTEND_URL — the single source of truth
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
    return [frontend_url]


class Settings:
    PROJECT_NAME: str = "Eulogik Interview Portal"
    PROJECT_VERSION: str = "1.0.0"

    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./interview_portal.db")

    # JWT
    SECRET_KEY: str = os.getenv("SECRET_KEY", "change-me-in-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 525600  # 1 year (365 days)

    # Uploads
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "uploads")

    # CORS
    BACKEND_CORS_ORIGINS: list[str] = _build_cors_origins()
    BACKEND_CORS_ORIGIN_REGEX: str = os.getenv(
        "BACKEND_CORS_ORIGIN_REGEX",
        r"https://.*\.vercel\.app",
    )

    # Email
    SMTP_HOST: str = os.getenv("SMTP_HOST", "")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", 587))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    FROM_EMAIL: str = os.getenv("FROM_EMAIL", SMTP_USER)


settings = Settings()
