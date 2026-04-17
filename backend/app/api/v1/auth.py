"""
Authentication API Endpoints
Handles user login and token generation for HR managers and interviewers.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta
from app import models, schemas
from app.core import security
from app.db.database import get_db

router = APIRouter()

@router.post("/login", response_model=schemas.Token)
def login(db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()):
    """
    User Login Endpoint
    Checks credentials against the database and returns a JWT access token if valid.
    """
    # 1. Look for the user in the database by their email/username
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    
    # 2. Safety check: does the user exist and is their password correct?
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 3. Create a JWT token with the user's details and role
    access_token_expires = timedelta(minutes=security.settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        data={"sub": user.email, "role": user.role.value}, 
        expires_delta=access_token_expires
    )
    
    # 4. Success! Send back the token for the frontend to use
    return {"access_token": access_token, "token_type": "bearer"}
