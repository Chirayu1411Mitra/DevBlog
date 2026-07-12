import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { Btn, Input } from '../components/DesignSystem';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [valid, setValid] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState(null);
  const [feedbackType, setFeedbackType] = useState('info');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    const check = async () => {
      try {
        const api = (import.meta.env.VITE_API_URL || 'http://localhost:6969/api').replace(/\/$/, '');
        await axios.get(`${api}/auth/reset/${token}`);
        setValid(true);
      } catch (err) {
        console.error('Invalid token', err);
        setFeedbackMessage('Invalid or expired token');
        setFeedbackType('error');
      }
    };
    check();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      setFeedbackMessage('Passwords do not match');
      setFeedbackType('error');
      return;
    }
    setLoading(true);
    try {
      const api = (import.meta.env.VITE_API_URL || 'http://localhost:6969/api').replace(/\/$/, '');
      await axios.post(`${api}/auth/reset/${token}`, { password });
      setFeedbackMessage('Password reset, please login');
      setFeedbackType('success');
      navigate('/login');
    } catch (err) {
      console.error('Reset error', err);
      setFeedbackMessage('Failed to reset password');
      setFeedbackType('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center p-4">
      {feedbackMessage && (
        <div className="fixed top-20 right-4 z-50">
          <div className={`p-4 rounded shadow-lg text-sm font-medium ${feedbackType === 'error' ? 'bg-destructive text-destructive-foreground' : 'bg-emerald-500 text-white'}`} onClick={() => setFeedbackMessage(null)}>
            {feedbackMessage}
          </div>
        </div>
      )}
      
      <div className="w-full max-w-[400px]">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2" style={{ fontFamily: "var(--font-display)" }}>Reset Password</h1>
          <p className="text-sm font-mono text-muted-foreground">Choose a new password for your account</p>
        </div>

        <div className="bg-card border border-border p-6 rounded-xl">
          {!token ? (
            <p className="text-center text-muted-foreground text-sm py-4">Invalid link</p>
          ) : valid ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="New Password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={setPassword}
                icon={<Lock size={16} />}
                required
              />
              <Input
                label="Confirm Password"
                type="password"
                placeholder="••••••••"
                value={confirm}
                onChange={setConfirm}
                icon={<Lock size={16} />}
                required
              />
              <Btn variant="primary" type="submit" className="w-full justify-center" disabled={loading} icon={loading ? <span className="w-4 h-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" /> : undefined}>
                {loading ? 'Resetting…' : 'Set New Password'}
              </Btn>
            </form>
          ) : (
            <p className="text-center text-muted-foreground text-sm py-4">Validating token...</p>
          )}
        </div>
      </div>
    </div>
  );
}
