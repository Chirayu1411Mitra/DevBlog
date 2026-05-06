import React from 'react';

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel', type = 'danger' }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card confirm-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
        <div className="modal-header" style={{ textAlign: 'left' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{title}</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>{message}</p>
        </div>
        <div className="modal-actions" style={{ marginTop: '2rem', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={onClose}>
            {cancelText}
          </button>
          <button 
            className={`btn ${type === 'danger' ? 'btn-danger' : 'btn-primary'}`} 
            onClick={() => {
              onConfirm();
              onClose();
            }}
            style={type === 'danger' ? { background: 'var(--danger)', color: 'white' } : {}}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
