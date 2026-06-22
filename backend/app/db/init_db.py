from app import models
from app.db.database import engine
from sqlalchemy import text


def init_db() -> None:
    """Create all database tables on startup and run automatic migrations."""
    models.Base.metadata.create_all(bind=engine)
    
    # Automatic DB migration for candidatestatus enum and existing records
    if engine.dialect.name == "postgresql":
        with engine.begin() as conn:
            try:
                # Add new enum values if they don't exist
                conn.execute(text("ALTER TYPE candidatestatus ADD VALUE IF NOT EXISTS 'Email sent for HR round'"))
                conn.execute(text("ALTER TYPE candidatestatus ADD VALUE IF NOT EXISTS 'Candidate not appeared'"))
                
                # Migrate any existing candidates still in Screening or Interview status
                conn.execute(text("UPDATE candidates SET status = 'Applied' WHERE status IN ('Screening', 'Interview')"))
            except Exception as e:
                # Logging the error but letting the app start normally
                import logging
                logging.getLogger(__name__).warning(f"Auto-migration skipped or failed: {str(e)}")

