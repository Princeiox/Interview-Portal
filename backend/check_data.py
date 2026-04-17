from app.db.database import SessionLocal
from app.models import Candidate, User, Assessment
import json

db = SessionLocal()
try:
    candidates = db.query(Candidate).all()
    users = db.query(User).all()
    assessments_all = db.query(Assessment).all()
    
    print(f"Total Users: {len(users)}")
    print(f"Total Candidates: {len(candidates)}")
    print(f"Total Assessments: {len(assessments_all)}")
    print("\n--- Candidate Details ---")
    for c in candidates:
        print(f"ID: {c.id:<4} Name: {c.full_name:<20} Status: {c.status}")
        assessments = db.query(Assessment).filter(Assessment.candidate_id == c.id).all()
        for a in assessments:
            print(f"    -> Assessment {a.id}: {a.assessment_type} Recommend='{a.recommendation}'")

finally:
    db.close()
