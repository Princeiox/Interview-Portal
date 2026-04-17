import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import './ConfirmModal.css';

const ConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Confirm Action", 
  message = "Are you sure you want to proceed?", 
  confirmText = "Confirm", 
  cancelText = "Cancel",
  type = "danger" 
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="confirm-modal animate-scale-in" onClick={e => e.stopPropagation()}>
        <button className="confirm-close-btn" onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>

        <div className="confirm-modal-header">
          <div className={`confirm-icon-wrapper ${type}`}>
            <AlertTriangle size={24} />
          </div>
        </div>
        
        <div className="confirm-modal-body">
          <h2 className="confirm-title">{title}</h2>
          <p className="confirm-message">{message}</p>
        </div>
        
        <div className="confirm-modal-actions">
          <button className="btn btn-outline" onClick={onClose}>
            {cancelText}
          </button>
          <button 
            className={`btn ${type === 'danger' ? 'btn-danger' : 'btn-primary'}`} 
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
