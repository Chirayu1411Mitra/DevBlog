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
        const api = (import.meta.env.VITE_API_URL || 'https://devblog-b.onrender.com/api').replace(/\/$/, '');
        await axios.get(`${api}/auth/reset/${token}`);
        setValid(true);
      } catch (err) {
        console.error('Invalid token', err);
        toast.error('Invalid or expired token');
      }
    };
    check();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) return toast.error('Passwords do not match');
    try {
      const api = (import.meta.env.VITE_API_URL || 'https://devblog-b.onrender.com/api').replace(/\/$/, '');
      await axios.post(`${api}/auth/reset/${token}`, { password });
      toast.success('Password reset, please login');
      navigate('/login');
    } catch (err) {
      console.error('Reset error', err);
      toast.error('Failed to reset password');
    }
  };

  return (
    <div className="page-container">
      <h2>Reset Password</h2>
      {!token ? (
        <p>Invalid link</p>
      ) : valid ? (
        <form onSubmit={handleSubmit} className="form-card">
          <label>New password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <label>Confirm password</label>
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          <button className="btn" type="submit">Set new password</button>
        </form>
      ) : (
        <p>Validating token...</p>
      )}
    </div>
  );
}
