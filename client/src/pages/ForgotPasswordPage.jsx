import React, { useState } from 'react';
import axios from 'axios';
import { useToast } from '../components/ToastContext';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const api = (import.meta.env.VITE_API_URL || 'http://localhost:6969/api').replace(/\/$/, '');
      await axios.post(`${api}/auth/forgot`, { email });
      setSent(true);
      toast.success('If that email exists, a reset link has been sent');
    } catch (err) {
      console.error('Forgot password error', err);
      const msg = err?.response?.data?.message || err.message || 'Failed to send reset link';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Forgot Password</h2>
          <p>Enter your email and we'll send you a reset link</p>
        </div>
        {sent ? (
          <div className="text-center" style={{ padding: '1.5rem 0' }}>
            <i className="fas fa-check-circle" style={{ fontSize: '2.5rem', color: 'var(--success)', marginBottom: '1rem', display: 'block' }}></i>
            <p style={{ color: 'var(--text-muted)' }}>If that email exists, we've sent instructions to reset your password.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="forgot-email">Email</label>
              <input
                type="email"
                id="forgot-email"
                className="form-control"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', marginTop: '.5rem' }}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
