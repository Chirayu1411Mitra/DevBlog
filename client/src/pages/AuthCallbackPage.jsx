import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useToast } from '../components/ToastContext';

const AuthCallbackPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { addToast } = useToast();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');

    if (token) {
      sessionStorage.setItem('token', token);
      addToast('Successfully logged in!', { type: 'success' });
      // Use replace to prevent user from navigating back to the callback page
      navigate('/', { replace: true });
    } else {
      addToast('Authentication failed. Please try again.', { type: 'error' });
      navigate('/login', { replace: true });
    }
  }, [location, navigate, addToast]);

  return <div>Loading...</div>;
};

export default AuthCallbackPage;