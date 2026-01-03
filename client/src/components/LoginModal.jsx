import React from 'react';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:6969/api';

const LoginModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleGitHubLogin = () => {
    window.location.href = `${API_URL}/auth/github`;
  };

  const handleLoginRedirect = () => {
    onClose();
    navigate('/login');
  };

  const handleRegisterRedirect = () => {
    onClose();
    navigate('/register');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <i className="fas fa-times"></i>
        </button>
        <div className="modal-header">
          <i className="fas fa-lock modal-icon"></i>
          <h2>Sign in required</h2>
          <p>Please sign in to access this feature</p>
        </div>
        <div className="modal-body">
          <button className="btn btn-github" onClick={handleGitHubLogin}>
            <i className="fab fa-github"></i>
            Sign in with GitHub
          </button>
          <div className="divider">
            <span>or</span>
          </div>
          <button className="btn btn-dark" onClick={handleLoginRedirect}>
            Sign in with Email
          </button>
          <p className="modal-footer-text">
            Don't have an account? <span className="link" onClick={handleRegisterRedirect}>Sign up</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
