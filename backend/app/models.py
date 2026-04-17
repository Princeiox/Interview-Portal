"""
Database Models for the Interview Portal.
Uses SQLAlchemy ORM to define the structure for Users, Candidates, and Assessments.
"""
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Float, Date, Text, Enum as SqlEnum, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.db.database import Base

# --- Enumerations ---

class UserRole(str, enum.Enum):
    """Enumeration for system user roles ensuring type safety in the database."""
    ADMIN = "ADMIN"
    HR = "HR"
    INTERVIEWER = "INTERVIEWER"


class CandidateStatus(str, enum.Enum):
    """Represents the current stage of a candidate in the recruitment pipeline."""
    APPLIED = "Applied"
    SCREENING = "Screening"
    INTERVIEW = "Interview"
    OFFERED = "Offered"
    HIRED = "Hired"
    REJECTED = "Rejected"


class AssessmentType(str, enum.Enum):
    """Categorizes the nature of an interview assessment round."""
    TECH = "Tech Round"
    HR = "HR Round"


# --- Core Models ---

class User(Base):
    """
    Represents internal staff accounts (Admins, HR, and Interviewers).
    These users have authenticated access to the portal dashboard.
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(SqlEnum(UserRole), default=UserRole.HR)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship: One user can conduct many assessments
    assessments = relationship("Assessment", back_populates="interviewer")


class Candidate(Base):
    """
    Stores comprehensive data from the candidate application form.
    Includes personal info, professional background, and pipeline status.
    """
    __tablename__ = "candidates"

    id = Column(Integer, primary_key=True, index=True)

    # Personal Information
    full_name = Column(String, nullable=False)
    email = Column(String, index=True, nullable=False)
    phone = Column(String, nullable=False)
    date_of_birth = Column(Date, nullable=True)
    gender = Column(String, nullable=True)
    marital_status = Column(String, nullable=True)
    nationality = Column(String, nullable=True)

    # Address Details
    current_address = Column(Text, nullable=True)
    current_city = Column(String, nullable=True)
    current_state = Column(String, nullable=True)
    current_zip = Column(String, nullable=True)
    permanent_address = Column(Text, nullable=True)
    permanent_city = Column(String, nullable=True)
    permanent_state = Column(String, nullable=True)
    permanent_zip = Column(String, nullable=True)

    # Professional/Job Details
    position_applied = Column(String, nullable=False)
    department = Column(String, nullable=True)
    expected_ctc = Column(String, nullable=True)
    current_ctc = Column(String, nullable=True)
    experience_years = Column(Integer, default=0)
    experience_months = Column(Integer, default=0)
    notice_period = Column(String, nullable=True)
    earliest_join_date = Column(Date, nullable=True)

    # Structured Professional Data (JSON formats for flexibility)
    education = Column(JSON, nullable=True)      # e.g., [{"degree": "B.Tech", "score": "8.5"}]
    work_experience = Column(JSON, nullable=True) # e.g., [{"company": "X", "designation": "Dev"}]
    skills = Column(JSON, nullable=True)          # e.g., ["Python", "AWS"]
    languages = Column(JSON, nullable=True)       # e.g., ["English", "Spanish"]
    references = Column(JSON, nullable=True)      # e.g., [{"name": "John", "phone": "..."}]

    # Additional Context
    statement_of_purpose = Column(Text, nullable=True)
    hobbies = Column(String, nullable=True)

    # File Assets
    photo_url = Column(String, nullable=True)   # Relative path to stored profile picture
    cv_url = Column(String, nullable=True)      # Relative path to stored CV document

    # Governance
    status = Column(SqlEnum(CandidateStatus), default=CandidateStatus.APPLIED)
    applied_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship: A candidate can undergo multiple assessment rounds
    assessments = relationship("Assessment", back_populates="candidate", cascade="all, delete-orphan")


class Assessment(Base):
    """
    Evaluations recorded for a specific candidate by an interviewer.
    Stores quantitative scores and qualitative remarks.
    """
    __tablename__ = "assessments"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"), nullable=False)
    interviewer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    assessment_type = Column(SqlEnum(AssessmentType), nullable=False)

    # Performance Metrics (Standard 1-10 scale)
    technical_score = Column(Integer, nullable=True)
    communication_score = Column(Integer, nullable=True)
    cultural_fit_score = Column(Integer, nullable=True)
    overall_score = Column(Integer, nullable=True)

    # Qualitative Feedback
    remarks = Column(Text, nullable=True)
    recommendation = Column(String, nullable=True)  # Final verdict: "Hire", "Reject", "Waitlist"
    conducted_at = Column(DateTime(timezone=True), server_default=func.now())

    # Database Relationships
    candidate = relationship("Candidate", back_populates="assessments")
    interviewer = relationship("User", back_populates="assessments")
