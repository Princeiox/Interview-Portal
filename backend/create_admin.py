from app.db.database import SessionLocal
from app.models import User, UserRole

from app.core.security import pwd_context

def run():
    db = SessionLocal()
    admin_email = "Admin@eulogik.com"
    existing = db.query(User).filter(User.email == admin_email).first()
    
    if existing:
        existing.role = UserRole.ADMIN
        existing.hashed_password = pwd_context.hash("Eulogik#123")
        db.commit()
        print(f"Admin already exists. Role and password updated.")
    else:
        new_admin = User(
            name="Admin User",
            email=admin_email,
            hashed_password=pwd_context.hash("Eulogik#123"),
            role=UserRole.ADMIN
        )
        db.add(new_admin)
        db.commit()
        print(f"Admin user created: {admin_email} / Eulogik#123")
    
if __name__ == "__main__":
    run()
