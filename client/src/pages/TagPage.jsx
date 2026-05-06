import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import PostCard from '../components/PostCard';
import Loader from '../components/Loader';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:6969/api';

export default function TagPage(){
  const { tag } = useParams();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = sessionStorage.getItem('token');

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await axios.get(`${API_URL}/posts/tag/${encodeURIComponent(tag)}`, { headers });
        setPosts(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, [tag, token]);

  if (loading) return <Loader />;

  return (
    <div className="main-container" style={{ marginTop: '2.5rem', paddingBottom: '4rem' }}>
      <div style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--accent)', marginBottom: '0.5rem' }}>#{tag}</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>{posts.length} {posts.length === 1 ? 'post' : 'posts'} tagged with <strong>{tag}</strong></p>
      </div>
      <div className="post-grid">
        {posts.length === 0 ? (
          <div className="card text-center" style={{ padding: '5rem 2rem', gridColumn: '1 / -1' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>No posts found with this tag yet.</p>
            <Link to="/" className="btn btn-secondary" style={{ marginTop: '1.5rem' }}>Back to Home</Link>
          </div>
        ) : (
          posts.map(p => (
            <PostCard key={p.id} post={p} token={token} />
          ))
        )}
      </div>
    </div>
  );
}
