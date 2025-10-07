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
      // default to localhost server used by this project when VITE_API_URL is not provided
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
    <div className="page-container">
      <h2>Forgot Password</h2>
      {sent ? (
        <p>If that email exists, we've sent instructions to reset your password.</p>
      ) : (
        <form onSubmit={handleSubmit} className="form-card">
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <button className="btn" type="submit" disabled={loading}>{loading ? 'Sending...' : 'Send reset link'}</button>
        </form>
      )}
    </div>
  );
}
