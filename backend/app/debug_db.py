from app.db.database import SessionLocal
from app.models import Assessment, User

def run():
    db = SessionLocal()
    assessments = db.query(Assessment).all()
    print(f"Total assessments: {len(assessments)}")
    for a in assessments:
        user = db.query(User).filter(User.id == a.interviewer_id).first()
        user_name = user.name if user else "Unknown"
        user_role = user.role if user else "Unknown"
        print(f"Assessment ID: {a.id}, Interviwer ID: {a.interviewer_id}, Name: {user_name}, Role: {user_role}")
    db.close()

if __name__ == "__main__":
    run()
