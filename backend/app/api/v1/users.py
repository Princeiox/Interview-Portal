from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.api.deps import get_admin_user
from app.core import security
from app.db.database import get_db

router = APIRouter()


def _serialize_interviewer(user: models.User) -> schemas.InterviewerResponse:
    return schemas.InterviewerResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at,
        assessments_count=len(user.assessments or []),
    )


@router.get("/interviewers", response_model=List[schemas.InterviewerResponse])
def list_interviewers(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_admin_user),
):
    interviewers = (
        db.query(models.User)
        .filter(models.User.role == models.UserRole.INTERVIEWER)
        .order_by(models.User.created_at.desc())
        .all()
    )
    return [_serialize_interviewer(user) for user in interviewers]


@router.post("/interviewers", response_model=schemas.InterviewerResponse, status_code=status.HTTP_201_CREATED)
def create_interviewer(
    data: schemas.InterviewerCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_admin_user),
):
    existing = db.query(models.User).filter(models.User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    interviewer = models.User(
        name=data.name,
        email=data.email,
        hashed_password=security.get_password_hash(data.password),
        role=models.UserRole.INTERVIEWER,
    )
    db.add(interviewer)
    db.commit()
    db.refresh(interviewer)
    return _serialize_interviewer(interviewer)


@router.delete("/interviewers/{user_id}")
def delete_interviewer(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_admin_user),
):
    interviewer = (
        db.query(models.User)
        .filter(models.User.id == user_id, models.User.role == models.UserRole.INTERVIEWER)
        .first()
    )
    if not interviewer:
        raise HTTPException(status_code=404, detail="Interviewer not found")

    db.query(models.Assessment).filter(models.Assessment.interviewer_id == interviewer.id).update(
        {models.Assessment.interviewer_id: None},
        synchronize_session=False,
    )
    db.delete(interviewer)
    db.commit()
    return {"detail": "Interviewer deleted"}
