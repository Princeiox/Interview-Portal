import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Users, ClipboardCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import ThemeToggle from '@/components/ThemeToggle';
import './Home.css';

export default function Home() {
  const navigate = useNavigate();
  const { isAuthenticated, logout, user, requestLogout } = useAuth();
  const toast = useToast();
  const isAdmin = user?.role === 'ADMIN';

  const handleLogout = () => {
    requestLogout();
  };

  const cards = [
    {
      icon: <FileText size={28} />,
      title: 'Apply for a Position',
      description: 'Submit your application as a candidate',
      action: 'Start Application',
      path: '/apply',
      visible: true
    },
    {
      icon: <Users size={28} />,
      title: 'View Candidates',
      description: 'Browse and manage all the candidates',
      action: 'Open Dashboard',
      path: '/candidates',
      visible: true
    },
    {
      icon: <ClipboardCheck size={28} />,
      title: isAdmin ? 'Create Interviewer' : 'Conduct Interview',
      description: isAdmin ? 'Create interviewer and assess candidates' : 'Assess candidates during the interviews',
      action: 'Go to Dashboard',
      path: (isAdmin || user?.role === 'INTERVIEWER') ? '/interview' : '/candidates',
      visible: true,
    }
  ].filter(card => card.visible);

  return (
    <div className="home-page">
      <header className="home-header">
        <div className="home-header-content">
          <div>
            <h1 className="home-title">Eulogik Interview Portal</h1>
            <p className="home-subtitle">Streamlined candidate management</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {isAuthenticated ? (
              <button className="btn btn-outline" onClick={handleLogout}>Logout</button>
            ) : (
              <button className="btn btn-primary" onClick={() => navigate('/login')}>Login</button>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="home-gradient-bar" />

      <main className="home-main">
        <div className="home-cards stagger-children">
          {cards.map((card, i) => (
            <div key={i} className="home-card card card-interactive">
              <div className="home-card-icon">{card.icon}</div>
              <h2 className="home-card-title">{card.title}</h2>
              <p className="home-card-desc">{card.description}</p>
              <button
                className="btn btn-block btn-primary"
                onClick={() => navigate(card.path)}
                id={`home-card-${i}`}
              >
                {card.action}
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
