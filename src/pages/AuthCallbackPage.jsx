import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const AuthCallbackPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');

    if (token) {
      // Store the token and redirect to the homepage
      localStorage.setItem('token', token);
      navigate('/');
    } else {
      // Handle login failure
      navigate('/login', { state: { error: 'GitHub login failed. Please try again.' } });
    }
  }, [location, navigate]);

  return <div>Loading...</div>;
};

export default AuthCallbackPage;