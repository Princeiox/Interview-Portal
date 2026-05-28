"""
Admin Account Setup Script
Creates or resets the default admin account for the Interview Portal.
Run this script whenever you need to create/reset the admin login.

Usage:  python create_admin.py
"""
import sys
import os

# Ensure the backend package is importable
sys.path.insert(0, os.path.dirname(__file__))

from app.db.database import SessionLocal, engine
from app import models
from app.core.security import get_password_hash

# Make sure tables exist
models.Base.metadata.create_all(bind=engine)

# Default admin credentials
ADMIN_EMAIL = "Admin@eulogik.com"
ADMIN_PASSWORD = "Eulogik123"
ADMIN_NAME = "Admin"

db = SessionLocal()

try:
    # Check if an admin user already exists
    existing = db.query(models.User).filter(models.User.email.ilike(ADMIN_EMAIL)).first()

    if existing:
        # Reset the password in case it's wrong
        existing.hashed_password = get_password_hash(ADMIN_PASSWORD)
        existing.role = models.UserRole.ADMIN
        existing.is_active = True
        db.commit()
        print(f"Admin account reset successfully!")
    else:
        # Create a fresh admin account
        admin = models.User(
            name=ADMIN_NAME,
            email=ADMIN_EMAIL,
            hashed_password=get_password_hash(ADMIN_PASSWORD),
            role=models.UserRole.ADMIN,
            position="Administrator",
            is_active=True,
        )
        db.add(admin)
        db.commit()
        print(f"Admin account created successfully!")

    print(f"  Email:    {ADMIN_EMAIL}")
    print(f"  Password: {ADMIN_PASSWORD}")

finally:
    db.close()
