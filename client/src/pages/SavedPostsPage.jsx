import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from '../components/ToastContext';
import PostCard from '../components/PostCard';
import { useNavigate } from 'react-router-dom';
import Loader from '../components/Loader';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:6969/api';

const SavedPostsPage = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { addToast } = useToast();
  const navigate = useNavigate();
  const token = sessionStorage.getItem('token');

  useEffect(() => {
    const fetchSavedPosts = async () => {
      if (!token) {
        addToast('You must be logged in to view saved posts.', { type: 'info' });
        navigate('/login');
        return;
      }
      try {
        const response = await axios.get(`${API_URL}/auth/me/saved-posts`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setPosts(response.data);
      } catch (err) {
        setError('Failed to fetch saved posts.');
        addToast(err.response?.data?.message || 'Failed to fetch saved posts.', { type: 'error' });
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSavedPosts();
  }, [token, addToast, navigate]);

  if (loading) {
    return <Loader />;
  }

  if (error) {
    return <p style={{ color: 'red' }}>{error}</p>;
  }

  return (
    <div className="saved-posts-page-container">
      <div className="saved-posts-header">
        <h2>My Saved Posts</h2>
        <p>You have {posts.length} saved posts</p>
      </div>
      <div className="post-list">
        {posts.length > 0 ? (
          posts.map((post) => (
            <PostCard key={post.id} post={post} token={token} />
          ))
        ) : (
          <p>You haven't saved any posts yet.</p>
        )}
      </div>
    </div>
  );
};

export default SavedPostsPage;
