
import sys
import os

# Add the current directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.models import User

def check_users():
    db: Session = SessionLocal()
    try:
        users = db.query(User).all()
        print(f"--- Database User List ---")
        if not users:
            print("No users found in the database.")
        for user in users:
            print(f"ID: {user.id} | Email: {user.email} | Role: {user.role}")
        print(f"--------------------------")
    except Exception as e:
        print(f"Error connecting to database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_users()
