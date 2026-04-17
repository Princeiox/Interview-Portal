"""
Candidates API v1
Handles candidate applications, listing, updates, and filtering.
Includes support for file uploads (CVs and Photos) using multipart form data.
"""
import os
import uuid
import json
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from app import models, schemas
from app.db.database import get_db
from app.api.deps import get_current_active_user, get_admin_user
from app.core.config import settings

router = APIRouter()

# Directories for storing file uploads
UPLOAD_DIR = settings.UPLOAD_DIR
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(os.path.join(UPLOAD_DIR, "photos"), exist_ok=True)
os.makedirs(os.path.join(UPLOAD_DIR, "cvs"), exist_ok=True)


def _save_file(file: UploadFile, sub_dir: str) -> str:
    """
    Saves an uploaded file with a unique UUID-based filename.
    Returns the public relative URL for the stored file.
    """
    ext = os.path.splitext(file.filename)[1]
    unique_name = f"{uuid.uuid4().hex}{ext}"
    path = os.path.join(UPLOAD_DIR, sub_dir, unique_name)
    with open(path, "wb") as f:
        f.write(file.file.read())
    return f"/uploads/{sub_dir}/{unique_name}"


@router.put("/{candidate_id}", response_model=schemas.CandidateResponse)
async def update_candidate(
    candidate_id: int,
    full_name: Optional[str] = Form(None),
    email: Optional[str] = Form(None),
    phone: Optional[str] = Form(None),
    position_applied: Optional[str] = Form(None),
    date_of_birth: Optional[str] = Form(None),
    gender: Optional[str] = Form(None),
    marital_status: Optional[str] = Form(None),
    nationality: Optional[str] = Form(None),
    current_address: Optional[str] = Form(None),
    current_city: Optional[str] = Form(None),
    current_state: Optional[str] = Form(None),
    current_zip: Optional[str] = Form(None),
    permanent_address: Optional[str] = Form(None),
    permanent_city: Optional[str] = Form(None),
    permanent_state: Optional[str] = Form(None),
    permanent_zip: Optional[str] = Form(None),
    department: Optional[str] = Form(None),
    expected_ctc: Optional[str] = Form(None),
    current_ctc: Optional[str] = Form(None),
    experience_years: Optional[int] = Form(None),
    experience_months: Optional[int] = Form(None),
    notice_period: Optional[str] = Form(None),
    earliest_join_date: Optional[str] = Form(None),
    education: Optional[str] = Form(None),
    work_experience: Optional[str] = Form(None),
    skills: Optional[str] = Form(None),
    languages: Optional[str] = Form(None),
    references: Optional[str] = Form(None),
    statement_of_purpose: Optional[str] = Form(None),
    hobbies: Optional[str] = Form(None),
    photo: Optional[UploadFile] = File(None),
    cv: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """
    Update an existing candidate's details.
    Handles multipart form data for file updates and JSON string parsing for list fields.
    """
    from datetime import date as date_type

    candidate = db.query(models.Candidate).filter(models.Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    # Update basic fields if provided
    if full_name is not None: candidate.full_name = full_name
    if email is not None: candidate.email = email
    if phone is not None: candidate.phone = phone
    if position_applied is not None: candidate.position_applied = position_applied
    if gender is not None: candidate.gender = gender
    if marital_status is not None: candidate.marital_status = marital_status
    if nationality is not None: candidate.nationality = nationality
    if current_address is not None: candidate.current_address = current_address
    if current_city is not None: candidate.current_city = current_city
    if current_state is not None: candidate.current_state = current_state
    if current_zip is not None: candidate.current_zip = current_zip
    if permanent_address is not None: candidate.permanent_address = permanent_address
    if permanent_city is not None: candidate.permanent_city = permanent_city
    if permanent_state is not None: candidate.permanent_state = permanent_state
    if permanent_zip is not None: candidate.permanent_zip = permanent_zip
    if department is not None: candidate.department = department
    if expected_ctc is not None: candidate.expected_ctc = expected_ctc
    if current_ctc is not None: candidate.current_ctc = current_ctc
    if experience_years is not None: candidate.experience_years = experience_years
    if experience_months is not None: candidate.experience_months = experience_months
    if notice_period is not None: candidate.notice_period = notice_period
    if statement_of_purpose is not None: candidate.statement_of_purpose = statement_of_purpose
    if hobbies is not None: candidate.hobbies = hobbies

    # Handle file updates
    if photo:
        candidate.photo_url = _save_file(photo, "photos")
    if cv:
        candidate.cv_url = _save_file(cv, "cvs")

    # Date parsing
    if date_of_birth:
        try:
            candidate.date_of_birth = date_type.fromisoformat(date_of_birth)
        except ValueError:
            pass
    
    if earliest_join_date:
        try:
            candidate.earliest_join_date = date_type.fromisoformat(earliest_join_date)
        except ValueError:
            pass

    # JSON parsing for structured fields
    if education is not None:
        try:
            candidate.education = json.loads(education)
        except json.JSONDecodeError:
            pass
            
    if work_experience is not None:
        try:
            candidate.work_experience = json.loads(work_experience)
        except json.JSONDecodeError:
            pass
            
    if skills is not None:
        try:
            candidate.skills = json.loads(skills)
        except json.JSONDecodeError:
            pass
            
    if languages is not None:
        try:
            candidate.languages = json.loads(languages)
        except json.JSONDecodeError:
            pass
            
    if references is not None:
        try:
            candidate.references = json.loads(references)
        except json.JSONDecodeError:
            pass

    db.commit()
    db.refresh(candidate)
    return candidate



@router.post("/apply", response_model=schemas.CandidateResponse)
async def apply(
    full_name: str = Form(...),
    email: str = Form(...),
    phone: str = Form(...),
    position_applied: str = Form(...),
    date_of_birth: Optional[str] = Form(None),
    gender: Optional[str] = Form(None),
    marital_status: Optional[str] = Form(None),
    nationality: Optional[str] = Form(None),
    current_address: Optional[str] = Form(None),
    current_city: Optional[str] = Form(None),
    current_state: Optional[str] = Form(None),
    current_zip: Optional[str] = Form(None),
    permanent_address: Optional[str] = Form(None),
    permanent_city: Optional[str] = Form(None),
    permanent_state: Optional[str] = Form(None),
    permanent_zip: Optional[str] = Form(None),
    department: Optional[str] = Form(None),
    expected_ctc: Optional[str] = Form(None),
    current_ctc: Optional[str] = Form(None),
    experience_years: int = Form(0),
    experience_months: int = Form(0),
    notice_period: Optional[str] = Form(None),
    earliest_join_date: Optional[str] = Form(None),
    education: Optional[str] = Form(None),
    work_experience: Optional[str] = Form(None),
    skills: Optional[str] = Form(None),
    languages: Optional[str] = Form(None),
    references: Optional[str] = Form(None),
    statement_of_purpose: Optional[str] = Form(None),
    hobbies: Optional[str] = Form(None),
    photo: Optional[UploadFile] = File(None),
    cv: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
):
    """
    Submit a new candidate application.
    This is a public endpoint used by candidates to apply for a position.
    """
    from datetime import date as date_type

    # Handle file uploads if provided
    photo_url = None
    cv_url = None
    if photo:
        photo_url = _save_file(photo, "photos")
    if cv:
        cv_url = _save_file(cv, "cvs")

    # Date parsing logic
    parsed_dob = None
    if date_of_birth:
        try:
            parsed_dob = date_type.fromisoformat(date_of_birth)
        except ValueError:
            parsed_dob = None

    parsed_join = None
    if earliest_join_date:
        try:
            parsed_join = date_type.fromisoformat(earliest_join_date)
        except ValueError:
            parsed_join = None

    # Instantiate the candidate model
    candidate = models.Candidate(
        full_name=full_name,
        email=email,
        phone=phone,
        position_applied=position_applied,
        date_of_birth=parsed_dob,
        gender=gender,
        marital_status=marital_status,
        nationality=nationality,
        current_address=current_address,
        current_city=current_city,
        current_state=current_state,
        current_zip=current_zip,
        permanent_address=permanent_address,
        permanent_city=permanent_city,
        permanent_state=permanent_state,
        permanent_zip=permanent_zip,
        department=department,
        expected_ctc=expected_ctc,
        current_ctc=current_ctc,
        experience_years=experience_years,
        experience_months=experience_months,
        notice_period=notice_period,
        earliest_join_date=parsed_join,
        education=json.loads(education) if education else None,
        work_experience=json.loads(work_experience) if work_experience else None,
        skills=json.loads(skills) if skills else None,
        languages=json.loads(languages) if languages else None,
        references=json.loads(references) if references else None,
        statement_of_purpose=statement_of_purpose,
        hobbies=hobbies,
        photo_url=photo_url,
        cv_url=cv_url,
        status=models.CandidateStatus.APPLIED,
    )
    
    db.add(candidate)
    db.commit()
    db.refresh(candidate)
    return candidate


@router.get("", response_model=List[schemas.CandidateResponse])
def list_candidates(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    position: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """
    Retrieve a list of candidates with optional search and filtering.
    Requires authentication.
    """
    q = db.query(models.Candidate).order_by(models.Candidate.applied_at.desc())

    # Text search across name, email, and position
    if search:
        pattern = f"%{search}%"
        q = q.filter(
            (models.Candidate.full_name.ilike(pattern))
            | (models.Candidate.email.ilike(pattern))
            | (models.Candidate.position_applied.ilike(pattern))
        )

    # Status filter (exact match)
    if status and status != "All Status":
        q = q.filter(models.Candidate.status == status)

    # Position filter (exact match)
    if position and position != "All Positions":
        q = q.filter(models.Candidate.position_applied == position)

    return q.all()


@router.get("/positions", response_model=List[str])
def list_positions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """
    Returns a distinct list of all positions applied for by candidates.
    Used to populate filter dropdowns in the UI.
    """
    rows = db.query(models.Candidate.position_applied).distinct().all()
    return [r[0] for r in rows if r[0]]


@router.get("/{candidate_id}", response_model=schemas.CandidateResponse)
def get_candidate(
    candidate_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """
    Fetch full details for a specific candidate by their unique ID.
    Includes related assessments.
    """
    candidate = db.query(models.Candidate).filter(models.Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return candidate


@router.patch("/{candidate_id}/status", response_model=schemas.CandidateResponse)
def update_candidate_status(
    candidate_id: int,
    status: schemas.CandidateUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """
    Update only the pipeline status of a candidate (e.g., from Applied to Screening).
    """
    candidate = db.query(models.Candidate).filter(models.Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    if status.status:
        candidate.status = status.status
    
    db.commit()
    db.refresh(candidate)
    return candidate


@router.delete("/{candidate_id}")
def delete_candidate(
    candidate_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_admin_user),
):
    """
    Permanently delete a candidate record and their associated assessments.
    """
    candidate = db.query(models.Candidate).filter(models.Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    db.delete(candidate)
    db.commit()
    return {"detail": "Candidate deleted"}
