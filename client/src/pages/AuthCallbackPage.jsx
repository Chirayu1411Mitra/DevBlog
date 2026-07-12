import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Loader from '../components/Loader';

const AuthCallbackPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [feedbackMessage, setFeedbackMessage] = useState(null);
  const [feedbackType, setFeedbackType] = useState('info');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');

    if (token) {
      setFeedbackMessage('Successfully logged in!');
      setFeedbackType('success');
      // Use replace to prevent user from navigating back to the callback page
      navigate('/', { replace: true });
    } else {
      setFeedbackMessage('Authentication failed. Please try again.');
      setFeedbackType('error');
      navigate('/login', { replace: true });
    }
    setLoading(false);
  }, [location, navigate]);

  if (loading) {
    return <div className="flex justify-center py-20"><Loader /></div>;
  }

  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      {feedbackMessage && (
        <div className={`mb-6 p-4 rounded text-sm font-medium ${feedbackType === 'error' ? 'bg-destructive/10 text-destructive' : 'bg-emerald-500/10 text-emerald-500'}`} onClick={() => setFeedbackMessage(null)}>
          {feedbackMessage}
        </div>
      )}
      <p className="text-muted-foreground text-sm">Redirecting...</p>
    </div>
  );
};

export default AuthCallbackPage;