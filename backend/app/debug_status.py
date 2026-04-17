from app.db.database import SessionLocal
from app.models import Candidate, Assessment
import json

db = SessionLocal()
try:
    candidates = db.query(Candidate).all()
    print(f"{'ID':<4} {'Name':<20} {'Status':<15}")
    print("-" * 40)
    for c in candidates:
        print(f"{c.id:<4} {c.full_name:<20} {c.status:<15}")
        assessments = db.query(Assessment).filter(Assessment.candidate_id == c.id).all()
        for a in assessments:
            print(f"    -> Assessment {a.id}: Recommend={a.recommendation}")
finally:
    db.close()
