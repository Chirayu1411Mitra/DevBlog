import React from 'react';

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel', type = 'danger' }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card confirm-modal w-[400px]" onClick={e => e.stopPropagation()}>
        <div className="modal-header text-left">
          <h3 className="text-lg mb-2">{title}</h3>
          <p className="text-text-muted text-sm">{message}</p>
        </div>
        <div className="modal-actions mt-6 flex justify-end gap-3">
          <button className="btn btn-secondary" onClick={onClose}>
            {cancelText}
          </button>
          <button
            className={`btn ${type === 'danger' ? 'btn-danger' : 'btn-primary'} text-white bg-${type === 'danger' ? 'danger' : 'accent'} hover:bg-${type === 'danger' ? 'danger/80' : 'accent/80'}`}
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
