from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app import models, schemas
from app.db.database import get_db
from app.api.deps import get_current_active_user

router = APIRouter()


@router.post("", response_model=schemas.AssessmentResponse)
def create_assessment(
    data: schemas.AssessmentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """Create a new interview assessment for a candidate."""
    candidate = db.query(models.Candidate).filter(models.Candidate.id == data.candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    assessment = models.Assessment(
        candidate_id=data.candidate_id,
        interviewer_id=current_user.id,
        assessment_type=data.assessment_type,
        technical_score=data.technical_score,
        communication_score=data.communication_score,
        cultural_fit_score=data.cultural_fit_score,
        overall_score=data.overall_score,
        remarks=data.remarks,
        recommendation=data.recommendation,
    )
    db.add(assessment)
    
    # Update candidate status based on recommendation
    rec = data.recommendation
    if rec in ["Reject", "Rejected"]:
        candidate.status = models.CandidateStatus.REJECTED
    elif rec in ["Hire", "Hired"]:
        candidate.status = models.CandidateStatus.HIRED
    elif rec in ["Next Round", "Interview"]:
        candidate.status = models.CandidateStatus.INTERVIEW
        
    db.commit()
    db.refresh(assessment)
    return assessment


@router.get("/candidate/{candidate_id}", response_model=List[schemas.AssessmentResponse])
def get_candidate_assessments(
    candidate_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """Get all assessments for a specific candidate."""
    return (
        db.query(models.Assessment)
        .filter(models.Assessment.candidate_id == candidate_id)
        .order_by(models.Assessment.conducted_at.desc())
        .all()
    )


@router.put("/{assessment_id}", response_model=schemas.AssessmentResponse)
def update_assessment(
    assessment_id: int,
    data: schemas.AssessmentUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """Update an interview assessment."""
    assessment = db.query(models.Assessment).filter(models.Assessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    
    # Authorization check: ADMIN and HR can edit anything; others can only edit their own
    current_role_str = str(current_user.role).upper()
    is_admin_or_hr = "ADMIN" in current_role_str or "HR" in current_role_str
    is_owner = assessment.interviewer_id == current_user.id
    
    if not (is_admin_or_hr or is_owner):
        raise HTTPException(
            status_code=403, 
            detail="Access Denied: You can only edit assessments that you have personally created. Please contact an Administrator  for further assistance."
        )

    if data.assessment_type is not None: assessment.assessment_type = data.assessment_type
    if data.technical_score is not None: assessment.technical_score = data.technical_score
    if data.communication_score is not None: assessment.communication_score = data.communication_score
    if data.cultural_fit_score is not None: assessment.cultural_fit_score = data.cultural_fit_score
    if data.overall_score is not None: assessment.overall_score = data.overall_score
    if data.remarks is not None: assessment.remarks = data.remarks
    if data.recommendation is not None: assessment.recommendation = data.recommendation

    # Update candidate status based on recommendation
    candidate = db.query(models.Candidate).filter(models.Candidate.id == assessment.candidate_id).first()
    if candidate:
        rec = assessment.recommendation
        if rec in ["Reject", "Rejected"]:
            candidate.status = models.CandidateStatus.REJECTED
        elif rec in ["Hire", "Hired"]:
            candidate.status = models.CandidateStatus.HIRED
        elif rec in ["Next Round", "Interview"]:
            candidate.status = models.CandidateStatus.INTERVIEW

    db.commit()
    db.refresh(assessment)
    return assessment
