import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/ToastContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://devblog-b.onrender.com/api';

const LoginPage = () => {
  const navigate = useNavigate();
  // form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleGitHubLogin = () => {
    window.location.href = `${API_BASE_URL.replace('/api', '')}/api/auth/github`;
  };

  const saveTokenAndRedirect = (token) => {
    localStorage.setItem('token', token);
    navigate('/');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const api = (API_BASE_URL || 'https://devblog-b.onrender.com/api').replace(/\/$/, '');
      const res = await axios.post(`${api}/auth/login`, { email, password });
      saveTokenAndRedirect(res.data.token);
    } catch (err) {
      console.error('Login failed', err.response?.data || err.message);
      const msg = err?.response?.data?.message || 'Login failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2>Sign In</h2>
        <p style={{ textAlign: 'center', color: 'var(--muted)' }}>Enter your credentials to access your account</p>
        <button className="oauth-btn" onClick={handleGitHubLogin}>Sign in with GitHub</button>
        <div className="auth-divider">OR CONTINUE WITH EMAIL</div>
        <form onSubmit={handleLogin} className="auth-form">
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <label>Password</label>
          <div className="password-field">
            <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button type="button" className="eye" onClick={() => setShowPassword(s => !s)} aria-label="toggle password">{showPassword ? '🙈' : '👁️'}</button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Remember me</label>
            <a href="/forgot-password">Forgot password?</a>
          </div>
          {error && <p style={{ color: 'red' }}>{error}</p>}
          <button className="btn" type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Sign In'}</button>
        </form>
        <div style={{ marginTop: 12, textAlign: 'center' }}>
          Don't have an account? <a href="/register">Create one here</a>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;