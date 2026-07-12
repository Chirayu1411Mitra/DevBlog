import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PostCard from '../components/PostCard';
import { useNavigate } from 'react-router-dom';
import Loader from '../components/Loader';
import { Bookmark, Search } from 'lucide-react';
import { Btn } from '../components/DesignSystem';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:6969/api';

const SavedPostsPage = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedbackMessage, setFeedbackMessage] = useState(null);
  const [feedbackType, setFeedbackType] = useState('info');
  const navigate = useNavigate();
  const token = document.cookie.includes('isLoggedIn=true');

  useEffect(() => {
    const fetchSavedPosts = async () => {
      if (!token) {
        setFeedbackMessage('You must be logged in to view saved posts.');
        setFeedbackType('info');
        navigate('/login');
        return;
      }
      try {
        const response = await axios.get(`${API_URL}/auth/me/saved-posts`);
        setPosts(response.data);
      } catch (err) {
        setError('Failed to fetch saved posts.');
        setFeedbackMessage(err.response?.data?.message || 'Failed to fetch saved posts.');
        setFeedbackType('error');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSavedPosts();
  }, [token, navigate]);

  if (loading) {
    return <div className="flex justify-center py-20"><Loader /></div>;
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto text-center mt-16 px-4">
        <p className="text-destructive mb-4">{error}</p>
        <Btn variant="primary" onClick={() => window.location.reload()}>Retry</Btn>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {feedbackMessage && (
        <div className={`mb-6 p-4 rounded text-sm font-medium ${feedbackType === 'error' ? 'bg-destructive/10 text-destructive' : 'bg-emerald-500/10 text-emerald-500'}`} onClick={() => setFeedbackMessage(null)}>
          {feedbackMessage}
        </div>
      )}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-1" style={{ fontFamily: "var(--font-display)" }}>Saved Posts</h1>
        <p className="text-sm font-mono text-muted-foreground">You have {posts.length} saved posts</p>
      </div>
      
      {posts.length > 0 ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg py-20 text-center">
          <Bookmark size={32} className="text-muted-foreground mx-auto mb-3 opacity-30" />
          <p className="text-foreground font-medium mb-1">No saved posts</p>
          <p className="text-sm text-muted-foreground mb-6">You haven't saved any posts yet.</p>
          <Btn variant="primary" onClick={() => navigate('/')}>Explore Posts</Btn>
        </div>
      )}
    </div>
  );
};

export default SavedPostsPage;
