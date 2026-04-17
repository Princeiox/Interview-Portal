from app.db.database import SessionLocal
from app.models import User, UserRole
from app.core.security import pwd_context

def reset():
    db = SessionLocal()
    users = db.query(User).all()
    
    password = "Password@123"
    hashed = pwd_context.hash(password)
    
    for user in users:
        user.hashed_password = hashed
        print(f"Reset password for {user.name} ({user.email}, role={user.role})")
    
    # Special case for Admin to keep the requested password if preferred, 
    # but let's just make it consistent for testing.
    # The user requested Admin: Admin@eulogik.com / Eulogik#123
    admin = db.query(User).filter(User.email == "Admin@eulogik.com").first()
    if admin:
        admin.hashed_password = pwd_context.hash("Eulogik#123")
        print("Set Admin@eulogik.com password to Eulogik#123")
        
    db.commit()
    db.close()
    print("\nAll user passwords have been reset.")
    print("Admin: Admin@eulogik.com / Eulogik#123")
    print("Others: [email] / Password@123")

if __name__ == "__main__":
    reset()
