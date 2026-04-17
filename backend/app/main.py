"""
Main FastAPI Application Entry Point
Configures the server, middleware, database initialization, and routes.
"""
import logging
import os

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.db.init_db import init_db
from app.api.v1 import auth, candidates, assessments, users

# Setup logging to help with debugging
logger = logging.getLogger(__name__)

# Initialize the FastAPI app
api = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    openapi_url="/api/v1/openapi.json",
    redirect_slashes=False,  # Important: prevent trailing slash redirects from breaking API calls
)

# ── CORS Configuration ───────────────────────────────────────────────────
# Allows the React frontend (running on another port) to talk to this API
api.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Database Initialization ──────────────────────────────────────────────
# When the server starts, make sure the database tables are ready
@api.on_event("startup")
def startup() -> None:
    init_db()

# ── Global Error Handling ──────────────────────────────────────────────
# Catch-all for any errors that we didn't explicitly handle to avoid server crashes
@api.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Something went wrong on %s %s", request.method, request.url.path, exc_info=exc)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})

# ── API Routes ────────────────────────────────────────────────────────
# Grouping our logic into modules (Auth, Candidates, etc.)
api.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])
api.include_router(candidates.router, prefix="/api/v1/candidates", tags=["Candidates"])
api.include_router(assessments.router, prefix="/api/v1/assessments", tags=["Assessments"])
api.include_router(users.router, prefix="/api/v1/users", tags=["Users"])

# ── Static Files ──────────────────────────────────────────────────────
# Serve files like uploaded CVs so they can be viewed in the browser
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
api.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

@api.get("/")
def root():
    return {"message": "Welcome to Eulogik Interview Portal API"}

# Main app instance
app = api
