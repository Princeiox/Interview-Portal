import os
from dotenv import load_dotenv

load_dotenv()

def _parse_csv(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]

class Settings:
    PROJECT_NAME: str = "Eulogik Interview Portal"
    PROJECT_VERSION: str = "1.0.0"

    # Database configuration
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./interview_portal.db")

    # JWT configuration
    SECRET_KEY: str = os.getenv("SECRET_KEY", "interview_portal_super_secret_key_2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # Upload directory
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "uploads")

    # CORS configuration
    BACKEND_CORS_ORIGINS: list[str] = _parse_csv(
        os.getenv(
            "BACKEND_CORS_ORIGINS",
            ",".join(
                [
                    "http://localhost:5173",
                    "http://localhost:3000",
                    "http://192.168.1.4:5173",
                    "https://interview-portal.vercel.app",
                    "https://interview-portal-seven.vercel.app",
                    "https://interview-portal-seven.vercel.app/",
                    "https://interview-portal-princeioxs-projects.vercel.app"
                ]
            ),
        )
    )
    BACKEND_CORS_ORIGIN_REGEX: str = os.getenv(
        "BACKEND_CORS_ORIGIN_REGEX",
        r"https://.*\.vercel\.app",
    )

settings = Settings()
