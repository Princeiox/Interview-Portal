import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LogoutModal from './components/LogoutModal';

import Home from './pages/Home';
import Login from './pages/Login';
import ApplicationForm from './pages/ApplicationForm';
import CandidateDashboard from './pages/CandidateDashboard';
import CandidateDetail from './pages/CandidateDetail';
import InterviewDashboard from './pages/InterviewDashboard';

function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && user && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/apply" element={<ApplicationForm />} />
        <Route path="/apply/:id" element={<ApplicationForm />} />
        
        <Route path="/candidates" element={
          <ProtectedRoute><CandidateDashboard /></ProtectedRoute>
        } />
        <Route path="/candidates/:id" element={
          <ProtectedRoute><CandidateDetail /></ProtectedRoute>
        } />
        <Route path="/interview" element={
          <ProtectedRoute><InterviewDashboard /></ProtectedRoute>
        } />
      </Routes>
      <LogoutModal />
    </>
  );
}

export default App;
