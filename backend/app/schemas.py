from pydantic import BaseModel, EmailStr
from typing import Optional, List, Any
from datetime import datetime, date
from app.models import UserRole, CandidateStatus, AssessmentType

# ── Authentication & Token ────────────────────────────────────────────────

class Token(BaseModel):
    """OAuth2 token response."""
    access_token: str
    token_type: str

class TokenData(BaseModel):
    """Decoded token payload."""
    email: Optional[str] = None
    role: Optional[str] = None

# ── User Management ───────────────────────────────────────────────────────

class UserCreate(BaseModel):
    """Schema for new user (HR/Interviewer) registration."""
    name: str
    email: EmailStr
    password: str
    role: UserRole = UserRole.HR

class UserResponse(BaseModel):
    """Schema for user data in API responses."""
    id: int
    name: str
    email: str
    role: UserRole
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# ── Candidate Application ────────────────────────────────────────────────

class InterviewerCreate(BaseModel):
    """Schema for creating an interviewer from the admin dashboard."""
    name: str
    email: EmailStr
    password: str

class InterviewerResponse(UserResponse):
    """Schema for interviewer data shown in the dashboard."""
    assessments_count: int = 0

class EducationEntry(BaseModel):
    degree: Optional[str] = None
    institution: Optional[str] = None
    board: Optional[str] = None
    field_of_study: Optional[str] = None
    graduation_year: Optional[str] = None
    percentage: Optional[str] = None

class WorkExperienceEntry(BaseModel):
    company_name: Optional[str] = None
    position: Optional[str] = None
    from_date: Optional[str] = None
    to_date: Optional[str] = None
    responsibilities: Optional[str] = None

class ReferenceEntry(BaseModel):
    name: Optional[str] = None
    designation: Optional[str] = None
    company: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None

class CandidateCreate(BaseModel):
    """Schema for submitting a new candidate application."""
    # Personal Info
    full_name: str
    email: EmailStr
    phone: str
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    marital_status: Optional[str] = None
    nationality: Optional[str] = None

    # Address
    current_address: Optional[str] = None
    current_city: Optional[str] = None
    current_state: Optional[str] = None
    current_zip: Optional[str] = None
    permanent_address: Optional[str] = None
    permanent_city: Optional[str] = None
    permanent_state: Optional[str] = None
    permanent_zip: Optional[str] = None

    # Job Application
    position_applied: str
    department: Optional[str] = None
    expected_ctc: Optional[str] = None
    current_ctc: Optional[str] = None
    experience_years: int = 0
    experience_months: int = 0
    notice_period: Optional[str] = None
    earliest_join_date: Optional[date] = None

    # Education, Experience, Skills, Languages, References
    education: Optional[List[EducationEntry]] = None
    work_experience: Optional[List[WorkExperienceEntry]] = None
    skills: Optional[List[str]] = None
    languages: Optional[List[str]] = None
    references: Optional[List[ReferenceEntry]] = None

    # Statement
    statement_of_purpose: Optional[str] = None
    hobbies: Optional[str] = None

class CandidateUpdate(BaseModel):
    """Schema for updating candidate details."""
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    marital_status: Optional[str] = None
    nationality: Optional[str] = None
    current_address: Optional[str] = None
    current_city: Optional[str] = None
    current_state: Optional[str] = None
    current_zip: Optional[str] = None
    permanent_address: Optional[str] = None
    permanent_city: Optional[str] = None
    permanent_state: Optional[str] = None
    permanent_zip: Optional[str] = None
    position_applied: Optional[str] = None
    department: Optional[str] = None
    expected_ctc: Optional[str] = None
    current_ctc: Optional[str] = None
    experience_years: Optional[int] = None
    experience_months: Optional[int] = None
    notice_period: Optional[str] = None
    earliest_join_date: Optional[date] = None
    education: Optional[List[Any]] = None
    work_experience: Optional[List[Any]] = None
    skills: Optional[List[str]] = None
    languages: Optional[List[str]] = None
    references: Optional[List[Any]] = None
    statement_of_purpose: Optional[str] = None
    hobbies: Optional[str] = None
    status: Optional[CandidateStatus] = None

# ── Assessment ────────────────────────────────────────────────────────────

class AssessmentCreate(BaseModel):
    """Schema for creating an interview assessment."""
    candidate_id: int
    assessment_type: AssessmentType
    technical_score: Optional[int] = None
    communication_score: Optional[int] = None
    cultural_fit_score: Optional[int] = None
    overall_score: Optional[int] = None
    remarks: Optional[str] = None
    recommendation: Optional[str] = None

class AssessmentUpdate(BaseModel):
    """Schema for updating an interview assessment."""
    assessment_type: Optional[AssessmentType] = None
    technical_score: Optional[int] = None
    communication_score: Optional[int] = None
    cultural_fit_score: Optional[int] = None
    overall_score: Optional[int] = None
    remarks: Optional[str] = None
    recommendation: Optional[str] = None

class AssessmentResponse(BaseModel):
    """Schema for assessment data in API responses."""
    id: int
    candidate_id: int
    interviewer_id: Optional[int] = None
    assessment_type: AssessmentType
    technical_score: Optional[int] = None
    communication_score: Optional[int] = None
    cultural_fit_score: Optional[int] = None
    overall_score: Optional[int] = None
    remarks: Optional[str] = None
    recommendation: Optional[str] = None
    conducted_at: datetime
    interviewer: Optional[UserResponse] = None

    class Config:
        from_attributes = True

# ── Candidate Response ───────────────────────────────────────────────────

class CandidateResponse(BaseModel):
    """Schema for candidate data in API responses."""
    id: int
    full_name: str
    email: str
    phone: str
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    marital_status: Optional[str] = None
    nationality: Optional[str] = None
    current_address: Optional[str] = None
    current_city: Optional[str] = None
    current_state: Optional[str] = None
    current_zip: Optional[str] = None
    permanent_address: Optional[str] = None
    permanent_city: Optional[str] = None
    permanent_state: Optional[str] = None
    permanent_zip: Optional[str] = None
    position_applied: str
    department: Optional[str] = None
    expected_ctc: Optional[str] = None
    current_ctc: Optional[str] = None
    experience_years: int = 0
    experience_months: int = 0
    notice_period: Optional[str] = None
    earliest_join_date: Optional[date] = None
    education: Optional[List[Any]] = None
    work_experience: Optional[List[Any]] = None
    skills: Optional[List[str]] = None
    languages: Optional[List[str]] = None
    references: Optional[List[Any]] = None
    statement_of_purpose: Optional[str] = None
    hobbies: Optional[str] = None
    photo_url: Optional[str] = None
    cv_url: Optional[str] = None
    status: CandidateStatus
    applied_at: datetime
    assessments: Optional[List[AssessmentResponse]] = None

    class Config:
        from_attributes = True
