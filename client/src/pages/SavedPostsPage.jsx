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
    return (
      <div className="main-container text-center" style={{ marginTop: '4rem' }}>
        <p style={{ color: 'var(--danger)' }}>{error}</p>
        <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <div className="main-container" style={{ marginTop: '2rem', paddingBottom: '4rem' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>My Saved Posts</h2>
        <p style={{ color: 'var(--text-muted)' }}>You have {posts.length} saved posts</p>
      </div>
      <div className="post-grid">
        {posts.length > 0 ? (
          posts.map((post) => (
            <PostCard key={post.id} post={post} token={token} />
          ))
        ) : (
          <div className="card text-center" style={{ padding: '5rem 2rem', gridColumn: '1 / -1' }}>
            <i className="far fa-bookmark" style={{ fontSize: '3rem', color: 'var(--border)', marginBottom: '1.5rem', display: 'block' }}></i>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>You haven't saved any posts yet.</p>
            <button className="btn btn-primary" style={{ marginTop: '1.5rem' }} onClick={() => navigate('/')}>Explore Posts</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SavedPostsPage;
