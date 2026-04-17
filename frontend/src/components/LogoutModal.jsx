import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useNavigate } from 'react-router-dom';
import { LogOut, X } from 'lucide-react';
import './LogoutModal.css';

export default function LogoutModal() {
  const { showLogoutModal, confirmLogout, cancelLogout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  if (!showLogoutModal) return null;

  const handleConfirm = () => {
    confirmLogout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  return (
    <div className="modal-overlay animate-fade-in" onClick={cancelLogout}>
      <div className="modal-content logout-modal animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <button className="icon-btn logout-close-btn" onClick={cancelLogout}>
          <X size={18} />
        </button>
        
        <div className="logout-icon-wrap">
          <LogOut size={32} />
        </div>
        
        <h2 className="logout-title">Ready to leave?</h2>
        <p className="logout-desc">Are you sure you want to log out of the Interview Portal?</p>
        
        <div className="logout-actions">
          <button className="btn btn-outline btn-block" onClick={cancelLogout}>
            Cancel
          </button>
          <button className="btn btn-primary btn-block logout-confirm-btn" onClick={handleConfirm}>
            Yes, Log Me Out
          </button>
        </div>
      </div>
    </div>
  );
}
