import sys
from app.db.database import SessionLocal
from app import models
from app.core import security

def create_admin():
    db = SessionLocal()
    try:
        # Check if admin already exists
        email = "admin@eulogik.com"
        admin = db.query(models.User).filter(models.User.email == email).first()
        if admin:
            print(f"Admin user {email} already exists!")
            return
            
        print("Creating default admin user...")
        new_admin = models.User(
            name="System Admin",
            email=email,
            hashed_password=security.get_password_hash("admin123"),
            role=models.UserRole.ADMIN,
            position="Director",
            is_active=True
        )
        db.add(new_admin)
        db.commit()
        print(f"Admin user created successfully!")
        print(f"Login Email: {email}")
        print(f"Password: admin123")
    except Exception as e:
        db.rollback()
        print(f"Error creating admin: {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    create_admin()
