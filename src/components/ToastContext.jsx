import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import './Toast.css';

const ToastContext = createContext(null);

export const useToast = () => useContext(ToastContext);

let id = 0;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    // cleanup on unmount
    return () => setToasts([]);
  }, []);

  const addToast = useCallback((message, { type = 'info', duration = 4000 } = {}) => {
    const _id = ++id;
    setToasts((t) => [...t, { id: _id, message, type }]);
    if (duration > 0) {
      setTimeout(() => {
        setToasts((t) => t.filter((x) => x.id !== _id));
      }, duration);
    }
    return _id;
  }, []);

  const removeToast = useCallback((_id) => {
    setToasts((t) => t.filter((x) => x.id !== _id));
  }, []);

  const success = useCallback((message, duration) => addToast(message, { type: 'success', duration }), [addToast]);
  const error = useCallback((message, duration) => addToast(message, { type: 'error', duration }), [addToast]);
  const info = useCallback((message, duration) => addToast(message, { type: 'info', duration }), [addToast]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast, success, error, info }}>
      {children}
      <div className="toast-root" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`} onClick={() => removeToast(t.id)}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export default ToastContext;
