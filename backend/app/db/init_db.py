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
                conn.execute(text("ALTER TYPE candidatestatus ADD VALUE IF NOT EXISTS 'Email sent for Tech round'"))
                conn.execute(text("ALTER TYPE candidatestatus ADD VALUE IF NOT EXISTS 'Candidate not appeared'"))
                conn.execute(text("ALTER TYPE candidatestatus ADD VALUE IF NOT EXISTS 'Candidate rejected the offer'"))
                
                # Migrate any existing candidates still in Screening or Interview status
                conn.execute(text("UPDATE candidates SET status = 'Applied' WHERE status IN ('Screening', 'Interview')"))
                
                # Ensure tests table has the duration column
                conn.execute(text("ALTER TABLE tests ADD COLUMN IF NOT EXISTS duration INTEGER DEFAULT 30"))

                # Ensure questions table has question_type column
                conn.execute(text("ALTER TABLE questions ADD COLUMN IF NOT EXISTS question_type VARCHAR DEFAULT 'MCQ'"))

                # Ensure candidates table has interview_date and meeting_link columns
                conn.execute(text("ALTER TABLE candidates ADD COLUMN IF NOT EXISTS interview_date TIMESTAMP WITH TIME ZONE"))
                conn.execute(text("ALTER TABLE candidates ADD COLUMN IF NOT EXISTS meeting_link VARCHAR"))

                # Drop NOT NULL constraints for options on PostgreSQL
                conn.execute(text("ALTER TABLE questions ALTER COLUMN option_a DROP NOT NULL"))
                conn.execute(text("ALTER TABLE questions ALTER COLUMN option_b DROP NOT NULL"))
                conn.execute(text("ALTER TABLE questions ALTER COLUMN option_c DROP NOT NULL"))
                conn.execute(text("ALTER TABLE questions ALTER COLUMN option_d DROP NOT NULL"))
                conn.execute(text("ALTER TABLE questions ALTER COLUMN correct_option DROP NOT NULL"))
            except Exception as e:
                # Logging the error but letting the app start normally
                import logging
                logging.getLogger(__name__).warning(f"Auto-migration skipped or failed: {str(e)}")


