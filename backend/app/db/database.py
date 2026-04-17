"""
Database Configuration Module.

This module handles the connection to the database using SQLAlchemy.
It sets up the engine, session factory, and the base class for models.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

# Database connection URL from configuration
SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL

# Create the SQLAlchemy engine instance
# For SQLite, we don't need 'check_same_thread': False unless we use async
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# Local session factory for creating new database sessions
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for SQLAlchemy declarative models
Base = declarative_base()

def get_db():
    """
    Dependency generator for database sessions.
    
    Yields:
        Session: A SQLAlchemy database session.
    
    Ensures that the session is closed after the request is finished.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
