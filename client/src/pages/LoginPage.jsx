import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Terminal } from 'lucide-react';
import { Btn, Input } from '../components/DesignSystem';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:6969/api';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const [feedbackMessage, setFeedbackMessage] = useState(null);
  const [feedbackType, setFeedbackType] = useState('info');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (document.cookie.includes('isLoggedIn=true')) {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/auth/login`, { email, password });
      
      setFeedbackMessage('Login successful!');
      setFeedbackType('success');
      navigate('/');
    } catch (error) {
      console.error('Login failed:', error);
      setFeedbackMessage(error.response?.data?.message || 'Login failed.');
      setFeedbackType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleGitHubLogin = () => {
    window.location.href = `${API_URL}/auth/github`;
  };

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        {feedbackMessage && (
          <div className={`mb-6 p-4 rounded text-sm font-medium ${feedbackType === 'error' ? 'bg-destructive/10 text-destructive' : 'bg-emerald-500/10 text-emerald-500'}`} onClick={() => setFeedbackMessage(null)}>
            {feedbackMessage}
          </div>
        )}
        <div className="mb-8 text-center">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Terminal size={18} className="text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>Welcome back</h1>
          <p className="text-sm text-muted-foreground mt-1">Sign in to your DevBlog account</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <Btn variant="outline" fullWidth icon={<Terminal size={16} />} onClick={handleGitHubLogin}>
            Continue with GitHub
          </Btn>
          
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <Input label="Email" placeholder="you@example.com" type="email" value={email} onChange={setEmail} />
            <Input label="Password" placeholder="••••••••" type="password" value={password} onChange={setPassword} />

            <div className="flex items-center justify-between text-sm pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded border-border" />
                <span className="text-muted-foreground">Remember me</span>
              </label>
              <button type="button" className="text-primary hover:underline text-sm">Forgot password?</button>
            </div>

            <Btn type="submit" variant="primary" fullWidth size="lg" loading={loading}>Sign in</Btn>
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-5">
          Don't have an account?{" "}
          <Link to="/register" className="text-primary hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;