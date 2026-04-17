from app import models
from app.db.database import engine


def init_db() -> None:
    """Create all database tables on startup."""
    models.Base.metadata.create_all(bind=engine)
