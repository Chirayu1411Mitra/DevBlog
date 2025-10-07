import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/ToastContext';

export default function RegisterPage(){
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const handleRegister = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const api = (import.meta.env.VITE_API_URL || 'http://localhost:6969/api').replace(/\/$/, '');
      await axios.post(`${api}/auth/register`, { username, email, password });
      toast.success('Registered successfully. Please login.');
      navigate('/login');
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Registration failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2>Join BlogSpace</h2>
        <p style={{ textAlign: 'center', color: 'var(--muted)' }}>Create your account and start sharing your stories</p>
        <button className="oauth-btn" onClick={() => window.location.href = ((import.meta.env.VITE_API_URL || 'http://localhost:6969/api').replace(/\/$/, '') + '/auth/github')}>Sign up with GitHub</button>
        <div className="auth-divider">OR CONTINUE WITH EMAIL</div>
        <form onSubmit={handleRegister} className="auth-form">
          <label>Full Name</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)} required />
          <label>Email Address</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <label>Password</label>
          <div className="password-field">
            <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button type="button" className="eye" onClick={() => setShowPassword(s => !s)} aria-label="toggle password">{showPassword ? '🙈' : '👁️'}</button>
          </div>
          <button className="btn" type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create Account'}</button>
        </form>
        <div style={{ marginTop: 12, textAlign: 'center' }}>
          Already have an account? <a href="/login">Sign in here</a>
        </div>
      </div>
    </div>
  );
}
