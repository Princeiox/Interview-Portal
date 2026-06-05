# Eulogik Interview Portal

A professional, full-stack recruitment management system designed for streamlining the interview process. Features a multi-step candidate application form, an admin dashboard for candidate management, and an interviewer interface for technical/HR assessments.

## 🚀 Features

- **Multi-Step Application Form**: Comprehensive form for candidates including personal details, education, work experience, and file uploads (CV & Photo).
- **Admin Dashboard**: Full control over candidate statuses (Applied, Screening, Interview, Offered, etc.) and interviewer management.
- **Interviewer Portal**: Role-based access for interviewers to view assigned candidates and submit structured assessments.
- **Real-time Search & Filtering**: Efficiently find candidates by name, position, or status.
- **Modern UI/UX**: Built with React and Vanilla CSS, featuring glassmorphism, smooth animations, and a responsive design.
- **Secure Authentication**: JWT-based authentication for admins and interviewers.

## 🛠️ Technology Stack

### Backend
- **FastAPI**: High-performance Python framework for building APIs.
- **SQLAlchemy**: SQL toolkit and Object-Relational Mapper (ORM).
- **PostgreSQL**: Robust relational database for data persistence.
- **Uvicorn**: Lightning-fast ASGI server.
- **Pydantic**: Data validation and settings management.

### Frontend
- **React**: Modern component-based library for the user interface.
- **Vite**: Ultra-fast build tool and development server.
- **Axios**: Promise-based HTTP client for API communication.
- **Lucide React**: Beautifully simple icons.
- **Vanilla CSS**: Custom design system for maximum flexibility.

## 📂 Project Structure

```text
Interview Portal/
├── backend/                # FastAPI Backend
│   ├── app/                # Source code
│   │   ├── api/            # API v1 routes (auth, candidates, users, assessments)
│   │   ├── core/           # Config and security settings
│   │   ├── db/             # Database connection and initialization
│   │   ├── models.py       # SQLAlchemy models
│   │   └── schemas.py      # Pydantic schemas
│   ├── uploads/            # Storage for CVs and photos
│   ├── .env                # Environment variables (not committed)
│   ├── .env.example        # Template for environment variables
│   ├── create_admin.py     # Admin account setup script
│   └── requirements.txt    # Python dependencies
└── frontend/               # React Frontend
    ├── src/
    │   ├── api/            # Axios configuration
    │   ├── components/     # Reusable UI components
    │   ├── context/        # Auth and Toast state management
    │   ├── features/       # Feature-based views
    │   └── App.jsx         # Routing configuration
    ├── .env                # Environment variables (not committed)
    ├── .env.example        # Template for environment variables
    └── package.json        # Node.js dependencies
```

## ⚙️ Setup Instructions

### Prerequisites
- **Python 3.11+** installed
- **Node.js 18+** installed
- **PostgreSQL** running locally (or a remote instance)

### 1. Backend Setup

```bash
cd backend

# Create and activate a virtual environment
python -m venv venv
.\venv\Scripts\activate        # Windows
# source venv/bin/activate     # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
copy .env.example .env         # Windows
# cp .env.example .env         # macOS/Linux
# Then edit .env with your PostgreSQL credentials

# Initialize the database and create an admin user
python create_admin.py

# Start the server
uvicorn app.main:app --reload
```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment variables
copy .env.example .env         # Windows
# cp .env.example .env         # macOS/Linux
# Then edit .env with your backend API URL

# Start the development server
npm run dev
```

## 🔧 Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/dbname` |
| `SECRET_KEY` | JWT signing secret | `your-secret-key` |
| `UPLOAD_DIR` | Directory for file uploads | `uploads` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:5173` |
| `BACKEND_CORS_ORIGINS` | (Optional) Explicit CORS origins | `https://app.com,https://www.app.com` |

### Frontend (`frontend/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `http://localhost:8000` |

> **Production tip:** Change `FRONTEND_URL` in the backend `.env` and `VITE_API_URL` in the frontend `.env` to your production URLs.


## 🌐 URLs (Local Development)

- **Frontend**: `http://localhost:5173`
- **Backend API**: `http://localhost:8000`
- **API Docs**: `http://localhost:8000/docs`

---
*Built with ❤️ by the Eulogik Team.*
