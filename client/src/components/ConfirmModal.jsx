import React from 'react';
import { Btn } from './DesignSystem';

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel', type = 'danger' }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-card border border-border shadow-lg rounded-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <h3 className="text-xl font-semibold mb-2" style={{ fontFamily: "var(--font-display)" }}>{title}</h3>
          <p className="text-muted-foreground text-[15px] leading-relaxed">{message}</p>
        </div>
        <div className="px-6 py-4 bg-secondary/50 border-t border-border flex justify-end gap-2">
          <Btn variant="ghost" onClick={onClose}>
            {cancelText}
          </Btn>
          <button
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              type === 'danger' 
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' 
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
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
