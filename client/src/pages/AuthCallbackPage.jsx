import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Import useAuth

const AuthCallbackPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth(); // Get login function from context

  useEffect(() => {
    console.log('AuthCallbackPage loaded. Location search:', location.search);
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    console.log('Extracted token:', token);

    if (token) {
      try {
        console.log('Calling login function from context...');
        login(token); // Use context login function (saves token, sets state, fetches user)
        console.log('Login function called. Redirecting...');
        // Redirect is now handled by AuthProvider's effect or you can keep it here
        navigate('/', { replace: true });
      } catch (error) {
        console.error('Error during context login:', error);
        navigate('/login', { state: { error: 'Failed to process login. Please try again.' } });
      }
    } else {
      console.error("No token found in callback URL");
      navigate('/login', { state: { error: 'GitHub login failed (no token). Please try again.' } });
    }
  }, [location, navigate, login]); // Add login to dependency array

  return <div>Processing login...</div>;
};

export default AuthCallbackPage;