import React, { useState } from 'react';
import axios from 'axios';
import { Mail, CheckCircle } from 'lucide-react';
import { Btn, Input } from '../components/DesignSystem';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState(null);
  const [feedbackType, setFeedbackType] = useState('info');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const api = (import.meta.env.VITE_API_URL || 'http://localhost:6969/api').replace(/\/$/, '');
      await axios.post(`${api}/auth/forgot`, { email });
      setSent(true);
      setFeedbackMessage('If that email exists, a reset link has been sent');
      setFeedbackType('success');
    } catch (err) {
      console.error('Forgot password error', err);
      const msg = err?.response?.data?.message || err.message || 'Failed to send reset link';
      setFeedbackMessage(msg);
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
          <h1 className="text-2xl font-bold text-foreground mb-2" style={{ fontFamily: "var(--font-display)" }}>Forgot Password</h1>
          <p className="text-sm font-mono text-muted-foreground">Enter your email and we'll send you a reset link</p>
        </div>

        {sent ? (
          <div className="bg-card border border-border p-8 rounded-xl text-center">
            <CheckCircle size={48} className="text-emerald-500 mx-auto mb-4" />
            <p className="text-sm text-foreground">If that email exists, we've sent instructions to reset your password.</p>
          </div>
        ) : (
          <div className="bg-card border border-border p-6 rounded-xl">
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Email address"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={setEmail}
                icon={<Mail size={16} />}
                required
              />
              <Btn variant="primary" type="submit" className="w-full justify-center" disabled={loading} icon={loading ? <span className="w-4 h-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" /> : undefined}>
                {loading ? 'Sending…' : 'Send Reset Link'}
              </Btn>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
