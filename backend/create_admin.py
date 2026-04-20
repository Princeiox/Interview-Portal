
import sys
import os

# Add the current directory to sys.path so we can import from 'app'
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from app.db.database import SessionLocal, engine
from app.models import User, UserRole, Base
from app.core.security import get_password_hash

def create_admin():
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)
    
    db: Session = SessionLocal()
    try:
        # Configuration for the new admin
        admin_email = "admin@eulogik.com"
        admin_password = "adminpassword123"
        admin_name = "System Admin"

        # Check if user already exists
        existing_user = db.query(User).filter(User.email == admin_email).first()
        if existing_user:
            print(f"User with email {admin_email} already exists.")
            return

        # Create new admin user
        new_admin = User(
            name=admin_name,
            email=admin_email,
            hashed_password=get_password_hash(admin_password),
            role=UserRole.ADMIN,
            is_active=True
        )

        db.add(new_admin)
        db.commit()
        print(f"Admin user created successfully!")
        print(f"Email: {admin_email}")
        print(f"Password: {admin_password}")
        print(f"Role: {UserRole.ADMIN}")
    except Exception as e:
        print(f"Error creating admin user: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_admin()
