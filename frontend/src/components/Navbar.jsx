
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Home, Users, ClipboardCheck, LogOut, Briefcase } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import './Navbar.css';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, requestLogout, isAuthenticated } = useAuth();

  if (!isAuthenticated || location.pathname === '/login') return null;

  const isAdmin = user?.role === 'ADMIN';
  const isInterviewer = user?.role === 'INTERVIEWER';

  const navItems = [
    { label: 'Home', path: '/', icon: <Home size={18} /> },
    { label: 'Candidates', path: '/candidates', icon: <Users size={18} />, hidden: false },
    { label: 'Interviews', path: '/interview', icon: <ClipboardCheck size={18} />, hidden: !isAdmin && !isInterviewer },
  ];

  return (
    <nav className="navbar">
      <div className="navbar-content">
        <div className="navbar-left" onClick={() => navigate('/')}>
          <div className="navbar-logo">
            <Briefcase size={22} />
          </div>
          <span className="navbar-brand">Interview Portal</span>
        </div>

        <div className="navbar-center">
          {navItems.map((item) => (
            !item.hidden && (
              <button
                key={item.path}
                className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
                onClick={() => navigate(item.path)}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            )
          ))}
        </div>

        <div className="navbar-right">
          <ThemeToggle />
          <div className="user-profile">
            <div className="user-info">
              <span className="user-name">{user?.name || 'User'}</span>
              <span className="user-role">{user?.role}</span>
            </div>
            <button className="logout-btn" onClick={requestLogout} title="Logout">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
