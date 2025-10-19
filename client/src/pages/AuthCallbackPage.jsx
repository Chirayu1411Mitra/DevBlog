import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const AuthCallbackPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // --- ADD LOGS ---
    console.log('AuthCallbackPage loaded. Location search:', location.search); // Log query string
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    console.log('Extracted token:', token); // Log the extracted token
    // --- END LOGS ---

    if (token) {
      try {
        // --- ADD LOGS ---
        console.log('Attempting to save token to localStorage...');
        localStorage.setItem('token', token); // Save the token
        console.log('Token saved to localStorage.');
        // --- END LOGS ---

        // Redirect to homepage or dashboard after saving
        navigate('/', { replace: true });
        // --- ADD LOG ---
        console.log('Redirecting to homepage...');
        // --- END LOG ---
      } catch (error) {
        // --- ADD LOG ---
        console.error('Error saving token to localStorage:', error);
        // --- END LOG ---
        navigate('/login', { state: { error: 'Failed to process login. Please try again.' } });
      }
    } else {
      // --- ADD LOG ---
      console.error("No token found in callback URL");
      // --- END LOG ---
      // Redirect to login page on error
      navigate('/login', { state: { error: 'GitHub login failed (no token). Please try again.' } });
    }
    // Run only once on component mount
  }, [location, navigate]);

  // Render a simple loading message or spinner
  return <div>Processing login...</div>;
};

export default AuthCallbackPage;