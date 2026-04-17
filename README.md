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
├── backend/            # FastAPI Backend
│   ├── app/            # Source code
│   │   ├── api/        # API v1 routes (auth, candidates, users)
│   │   ├── core/       # Config and security settings
│   │   ├── db/         # Database connection and initialization
│   │   ├── models.py   # SQLAlchemy models
│   │   └── schemas.py  # Pydantic schemas
│   ├── uploads/        # Storage for CVs and photos
│   └── requirements.txt
└── frontend/           # React Frontend
    ├── src/
    │   ├── api/        # Axios configuration
    │   ├── components/ # Reusable UI components
    │   ├── context/    # Auth and Toast state management
    │   ├── pages/      # Dashboard and Form views
    │   └── App.jsx     # Routing configuration
    └── package.json
```

## ⚙️ Setup Instructions

### 1. Backend Setup
1. Navigate to the backend directory: `cd backend`
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   .\venv\Scripts\activate
   ```
3. Install dependencies: `pip install -r requirements.txt`
4. Configure `.env` with your PostgreSQL credentials.
5. Initialize the database and create an admin user:
   ```bash
   python create_admin.py
   ```
6. Start the server:
   ```bash
   uvicorn app.main:app --reload
   ```

### 2. Frontend Setup
1. Navigate to the frontend directory: `cd frontend`
2. Install dependencies: `npm install`
3. Start the development server: `npm run dev`

## 🔐 Credentials (Demo)
- **Admin**: `Admin@eulogik.com` / `Eulogik#123`
- **Frontend URL**: `http://localhost:5173`
- **Backend API**: `http://localhost:8000/docs`

---
*Built with ❤️ by the Eulogik Team.*
