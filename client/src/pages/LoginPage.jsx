import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useToast } from '../components/ToastContext';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:6969/api';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const { addToast } = useToast();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API_URL}/auth/login`, { email, password });
      sessionStorage.setItem('token', response.data.token);
      addToast('Login successful!', { type: 'success' });
      navigate('/');
    } catch (error) {
      console.error('Login failed:', error);
      addToast(error.response?.data?.message || 'Login failed.', { type: 'error' });
    }
  };

  const handleGitHubLogin = () => {
    window.location.href = `${API_URL}/auth/github`;
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="logo">
            <i className="fas fa-file-alt"></i>
            <span>Dev Blog</span>
          </div>
          <h2>Welcome Back</h2>
          <p>Sign in to your account to continue</p>
        </div>

        <button className="btn btn-github" onClick={handleGitHubLogin}>
          <i className="fab fa-github"></i>
          Sign in with GitHub
        </button>

        <div className="divider">
          <span>or continue with email</span>
        </div>

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
            <Link to="/forgot-password" className="forgot-password">Forgot password?</Link>
          </div>
          <button type="submit" className="btn btn-dark">Sign In</button>
        </form>

        <div className="auth-footer">
          <p>Don't have an account? <Link to="/register">Sign up</Link></p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;