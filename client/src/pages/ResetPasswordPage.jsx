import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useToast } from '../components/ToastContext';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [valid, setValid] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) return;
    const check = async () => {
      try {
        const api = (import.meta.env.VITE_API_URL || 'http://localhost:6969/api').replace(/\/$/, '');
        await axios.get(`${api}/auth/reset/${token}`);
        setValid(true);
      } catch (err) {
        console.error('Invalid token', err);
        toast.error('Invalid or expired token');
      }
    };
    check();
  }, [token, toast]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) return toast.error('Passwords do not match');
    try {
      const api = (import.meta.env.VITE_API_URL || 'http://localhost:6969/api').replace(/\/$/, '');
      await axios.post(`${api}/auth/reset/${token}`, { password });
      toast.success('Password reset, please login');
      navigate('/login');
    } catch (err) {
      console.error('Reset error', err);
      toast.error('Failed to reset password');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Reset Password</h2>
          <p>Choose a new password for your account</p>
        </div>
        {!token ? (
          <p className="text-center" style={{ color: 'var(--text-muted)' }}>Invalid link</p>
        ) : valid ? (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="new-password">New Password</label>
              <input type="password" id="new-password" className="form-control" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            <div className="form-group">
              <label htmlFor="confirm-password">Confirm Password</label>
              <input type="password" id="confirm-password" className="form-control" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" required />
            </div>
            <button className="btn btn-primary" type="submit" style={{ width: '100%', marginTop: '.5rem' }}>Set New Password</button>
          </form>
        ) : (
          <p className="text-center" style={{ color: 'var(--text-muted)' }}>Validating token...</p>
        )}
      </div>
    </div>
  );
}
