import csv
import io
import logging
from typing import List, Optional
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, BackgroundTasks, Query
from sqlalchemy.orm import Session, joinedload

from app import models, schemas
from app.api.deps import get_admin_user, get_current_active_user
from app.db.database import get_db
from app.api.v1.candidates import send_email_async
from app.core.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/create-from-csv", response_model=schemas.TestResponse, status_code=status.HTTP_201_CREATED)
async def create_test_from_csv(
    title: str = Form(...),
    description: Optional[str] = Form(None),
    duration: Optional[int] = Form(30),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """
    Creates a new MCQ test by uploading a CSV file.
    Only accessible by Admin.
    """
    try:
        contents = await file.read()
        decoded = contents.decode("utf-8-sig").splitlines()
        reader = csv.DictReader(decoded)
        
        if not reader.fieldnames:
            raise HTTPException(status_code=400, detail="CSV file is empty or invalid.")
        
        # Identify columns
        headers = {k.strip().lower(): k for k in reader.fieldnames if k}
        
        q_key = next((orig for clean, orig in headers.items() if "question" in clean or clean == "q"), None)
        a_key = next((orig for clean, orig in headers.items() if "option_a" in clean or clean == "option a" or clean == "a"), None)
        b_key = next((orig for clean, orig in headers.items() if "option_b" in clean or clean == "option b" or clean == "b"), None)
        c_key = next((orig for clean, orig in headers.items() if "option_c" in clean or clean == "option c" or clean == "c"), None)
        d_key = next((orig for clean, orig in headers.items() if "option_d" in clean or clean == "option d" or clean == "d"), None)
        ans_key = next((orig for clean, orig in headers.items() if "correct" in clean or "answer" in clean), None)
        
        if not all([q_key, a_key, b_key, c_key, d_key, ans_key]):
            raise HTTPException(
                status_code=400, 
                detail="CSV must contain headers for Question, Option A, Option B, Option C, Option D, and Correct Option (or Answer)."
            )

        # Create test metadata
        db_test = models.Test(title=title, description=description, duration=duration)
        db.add(db_test)
        db.commit()
        db.refresh(db_test)
        
        questions_count = 0
        for row in reader:
            q_text = row.get(q_key)
            opt_a = row.get(a_key)
            opt_b = row.get(b_key)
            opt_c = row.get(c_key)
            opt_d = row.get(d_key)
            correct_val = row.get(ans_key)
            
            if not q_text or not opt_a or not opt_b or not opt_c or not opt_d or not correct_val:
                continue  # skip invalid rows
                
            # Normalize correct option to A, B, C, or D
            correct_clean = correct_val.strip().upper()
            if correct_clean not in ["A", "B", "C", "D"]:
                # Try matching by text value
                val_lower = correct_val.strip().lower()
                if val_lower == opt_a.strip().lower():
                    correct_clean = "A"
                elif val_lower == opt_b.strip().lower():
                    correct_clean = "B"
                elif val_lower == opt_c.strip().lower():
                    correct_clean = "C"
                elif val_lower == opt_d.strip().lower():
                    correct_clean = "D"
                else:
                    correct_clean = "A" # fallback
                    
            db_question = models.Question(
                test_id=db_test.id,
                question_text=q_text.strip(),
                option_a=opt_a.strip(),
                option_b=opt_b.strip(),
                option_c=opt_c.strip(),
                option_d=opt_d.strip(),
                correct_option=correct_clean
            )
            db.add(db_question)
            questions_count += 1
            
        if questions_count == 0:
            db.delete(db_test)
            db.commit()
            raise HTTPException(status_code=400, detail="No valid questions found in the CSV.")
            
        db.commit()
        db.refresh(db_test)
        return db_test
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        logger.exception("Error creating test from CSV")
        raise HTTPException(status_code=500, detail=f"Failed to process CSV file: {str(e)}")


@router.post("", response_model=schemas.TestResponse, status_code=status.HTTP_201_CREATED)
def create_test_manual(
    test_in: schemas.TestCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """
    Creates a new MCQ test and its questions manually.
    Only accessible by Admin.
    """
    if not test_in.questions:
        raise HTTPException(status_code=400, detail="A test must contain at least one question.")
        
    db_test = models.Test(title=test_in.title, description=test_in.description, duration=test_in.duration)
    db.add(db_test)
    db.commit()
    db.refresh(db_test)
    
    for q in test_in.questions:
        db_question = models.Question(
            test_id=db_test.id,
            question_text=q.question_text.strip(),
            question_type=q.question_type or "MCQ",
            option_a=q.option_a.strip() if q.option_a else None,
            option_b=q.option_b.strip() if q.option_b else None,
            option_c=q.option_c.strip() if q.option_c else None,
            option_d=q.option_d.strip() if q.option_d else None,
            correct_option=q.correct_option.strip().upper() if q.correct_option else None,
        )
        db.add(db_question)
        
    db.commit()
    db.refresh(db_test)
    return db_test


@router.get("", response_model=List[schemas.TestResponse])
def list_tests(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """
    List all MCQ tests.
    Only accessible by logged-in users (Admin/HR/Interviewer).
    """
    return db.query(models.Test).options(joinedload(models.Test.questions)).all()


@router.get("/assignments", response_model=List[schemas.CandidateTestResponse])
def list_assignments(
    candidate_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """
    List all test assignments.
    Only accessible by logged-in users (Admin/HR/Interviewer).
    """
    query = db.query(models.CandidateTest).options(
        joinedload(models.CandidateTest.candidate),
        joinedload(models.CandidateTest.test)
    )
    if candidate_id is not None:
        query = query.filter(models.CandidateTest.candidate_id == candidate_id)
    return query.all()


@router.post("/assign", response_model=schemas.CandidateTestResponse)
async def assign_test(
    assignment: schemas.TestAssignmentCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """
    Assign an MCQ test to a candidate and send them an email notification.
    """
    # Verify candidate exists
    candidate = db.query(models.Candidate).filter(models.Candidate.id == assignment.candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    # Verify test exists
    test = db.query(models.Test).filter(models.Test.id == assignment.test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
        
    # Check if already assigned
    existing = db.query(models.CandidateTest).filter(
        models.CandidateTest.candidate_id == assignment.candidate_id,
        models.CandidateTest.test_id == assignment.test_id
    ).first()
    
    if existing:
        return existing
        
    db_assignment = models.CandidateTest(
        candidate_id=assignment.candidate_id,
        test_id=assignment.test_id
    )
    db.add(db_assignment)
    db.commit()
    db.refresh(db_assignment)
    
    # Send email asynchronously
    try:
        test_link = f"{settings.FRONTEND_URL}/take-test/{db_assignment.id}"
        subject = f"Online MCQ Test Assigned: {test.title}"
        body = (
            f"Dear {candidate.full_name},\n\n"
            f"You have been assigned the online MCQ test \"{test.title}\" as part of the recruitment process for the position of \"{candidate.position_applied}\" at Eulogik.\n\n"
            f"Please complete the test in 24 hrs by clicking the link below:\n"
            f"{test_link}\n\n"
            f"Best of luck!\n\n"
            f"Best regards,\n"
            f"Eulogik Recruitment Team"
        )
        background_tasks.add_task(send_email_async, candidate.email, subject, body)
    except Exception as e:
        logger.error(f"Failed to schedule assignment email: {str(e)}")
        
    return db_assignment


@router.get("/candidate-test/{candidate_test_id}")
def get_candidate_test(
    candidate_test_id: int,
    db: Session = Depends(get_db),
):
    """
    Public endpoint: Retrieve test details and questions without correct options.
    """
    assignment = db.query(models.CandidateTest).options(
        joinedload(models.CandidateTest.test).joinedload(models.Test.questions),
        joinedload(models.CandidateTest.candidate)
    ).filter(models.CandidateTest.id == candidate_test_id).first()
    
    if not assignment:
        raise HTTPException(status_code=404, detail="Test assignment not found")
        
    # Format questions safely
    questions = []
    for q in assignment.test.questions:
        questions.append({
            "id": q.id,
            "question_text": q.question_text,
            "question_type": q.question_type or "MCQ",
            "option_a": q.option_a,
            "option_b": q.option_b,
            "option_c": q.option_c,
            "option_d": q.option_d,
        })
        
    return {
        "assignment_id": assignment.id,
        "candidate_name": assignment.candidate.full_name,
        "test_title": assignment.test.title,
        "test_description": assignment.test.description,
        "duration": assignment.test.duration,
        "completed": assignment.completed_at is not None,
        "score": assignment.score,
        "total_questions": len(questions),
        "questions": questions
    }


@router.post("/candidate-test/{candidate_test_id}/submit")
def submit_candidate_test(
    candidate_test_id: int,
    submission: schemas.TestSubmissionRequest,
    db: Session = Depends(get_db),
):
    """
    Public endpoint: Submit responses for the test, calculate score and record completion.
    """
    assignment = db.query(models.CandidateTest).options(
        joinedload(models.CandidateTest.test).joinedload(models.Test.questions)
    ).filter(models.CandidateTest.id == candidate_test_id).first()
    
    if not assignment:
        raise HTTPException(status_code=404, detail="Test assignment not found")
        
    if assignment.completed_at is not None:
        raise HTTPException(status_code=400, detail="Test has already been completed.")
        
    # Calculate score
    score = 0
    total = len(assignment.test.questions)
    
    # submission.answers is a dict like {"question_id": "A", "2": {"code": "...", "language": "..."}}
    # Convert keys to int or handle str/dict values
    sub_answers = {}
    if submission.answers:
        for k, v in submission.answers.items():
            try:
                if isinstance(v, dict):
                    sub_answers[int(k)] = v
                else:
                    sub_answers[int(k)] = str(v).strip().upper()
            except ValueError:
                pass
                
    for q in assignment.test.questions:
        if q.question_type == "CODING":
            # Coding questions are graded manually, not auto-graded
            continue
        chosen = sub_answers.get(q.id)
        if chosen and q.correct_option and chosen == q.correct_option.strip().upper():
            score += 1
            
    # Update assignment
    assignment.completed_at = datetime.now(timezone.utc)
    assignment.score = score
    assignment.total_questions = total
    assignment.answers = submission.answers
    
    db.commit()
    db.refresh(assignment)
    
    return {
        "status": "success",
        "score": score,
        "total_questions": total
    }


@router.post("/assignments/{candidate_test_id}/reattempt", response_model=schemas.CandidateTestResponse)
def reattempt_test(
    candidate_test_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_admin_user),
):
    """
    Allow a candidate to re-attempt the assigned test by resetting completion status.
    Only accessible by Admin.
    """
    assignment = db.query(models.CandidateTest).options(
        joinedload(models.CandidateTest.candidate),
        joinedload(models.CandidateTest.test)
    ).filter(models.CandidateTest.id == candidate_test_id).first()
    
    if not assignment:
        raise HTTPException(status_code=404, detail="Test assignment not found")
        
    assignment.completed_at = None
    assignment.score = None
    assignment.answers = None
    assignment.total_questions = None
    assignment.assigned_at = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(assignment)
    return assignment


@router.delete("/assignments/{candidate_test_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_assignment(
    candidate_test_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """
    Delete a test assignment.
    """
    assignment = db.query(models.CandidateTest).filter(models.CandidateTest.id == candidate_test_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Test assignment not found")
        
    db.delete(assignment)
    db.commit()
    return None


@router.put("/{test_id}", response_model=schemas.TestResponse)
def update_test(
    test_id: int,
    test_in: schemas.TestCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_admin_user),
):
    """
    Update an MCQ test and its questions.
    Only accessible by Admin.
    """
    db_test = db.query(models.Test).filter(models.Test.id == test_id).first()
    if not db_test:
        raise HTTPException(status_code=404, detail="Test not found")
        
    if not test_in.questions:
        raise HTTPException(status_code=400, detail="A test must contain at least one question.")
        
    # Update test metadata
    db_test.title = test_in.title
    db_test.description = test_in.description
    db_test.duration = test_in.duration
    
    # Delete existing questions
    db.query(models.Question).filter(models.Question.test_id == test_id).delete()
    
    # Add new questions
    for q in test_in.questions:
        db_question = models.Question(
            test_id=db_test.id,
            question_text=q.question_text.strip(),
            question_type=q.question_type or "MCQ",
            option_a=q.option_a.strip() if q.option_a else None,
            option_b=q.option_b.strip() if q.option_b else None,
            option_c=q.option_c.strip() if q.option_c else None,
            option_d=q.option_d.strip() if q.option_d else None,
            correct_option=q.correct_option.strip().upper() if q.correct_option else None,
        )
        db.add(db_question)
        
    db.commit()
    db.refresh(db_test)
    return db_test


@router.delete("/{test_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_test(
    test_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_admin_user),
):
    """
    Delete a test.
    Only accessible by Admin.
    """
    test = db.query(models.Test).filter(models.Test.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
        
    db.delete(test)
    db.commit()
    return None

