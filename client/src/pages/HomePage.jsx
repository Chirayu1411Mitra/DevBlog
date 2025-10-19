import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

const API_URL = import.meta.env.VITE_API_URL ?? 'https://devblog-b.onrender.com/api';

const HomePage = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await axios.get(`${API_URL}/posts`);
        setPosts(response.data);
      } catch (err) {
        setError('Failed to fetch posts.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, []);

  const heroLoggedOut = (
    <section className="hero hero-logged-out">
      <div className="hero-inner">
        <h1 className="hero-title">Share Your Story with the World</h1>
        <p className="hero-sub">Join thousands of writers and readers in our vibrant community. Discover amazing stories, share your thoughts, and connect with like-minded people.</p>
        <div className="hero-ctas">
          <button className="cta-btn cta-primary" onClick={() => navigate('/register')}>Start Writing Today</button>
          <button className="cta-btn" onClick={() => navigate('/login')}>Sign In</button>
        </div>
      </div>
    </section>
  );

  const heroLoggedIn = (
    <section className="hero hero-logged-in">
      <div className="hero-inner">
        <h1 className="hero-title">Discover Amazing Stories</h1>
        <p className="hero-sub">Join our community of writers and readers. Share your thoughts, learn from others, and explore topics that matter to you.</p>
        <div className="hero-ctas">
          <button className="cta-btn cta-primary" onClick={() => navigate('/create')}>Start Writing</button>
        </div>
      </div>
    </section>
  );

  if (loading)
    return (
      <div>
        <div className="skeleton" style={{ height: 24, width: '40%', margin: '1rem auto 0' }} />
        <div className="skeleton" style={{ height: 120, marginTop: 12 }} />
      </div>
    );
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <div>
      {/* hero */}
      {token ? heroLoggedIn : heroLoggedOut}

      <section className="featured">
        <div className="featured-header">
          <h2>Featured Articles</h2>
          <Link to="/">View All</Link>
        </div>
        {posts.length > 0 ? (
          posts.map((post) => (
            <div key={post.id} className="post-card fade-in">
              <h2>
                <Link to={`/post/${post.id}`}>{post.title}</Link>
              </h2>
              <p>
                by {post.username} -{' '}
                <small>{formatDistanceToNow(new Date(post.created_at))} ago</small>
              </p>
              {(() => {
                const tags = Array.isArray(post.tags) ? post.tags : (post.tags ? [post.tags] : []);
                return tags.length > 0 ? (
                  <div style={{ marginTop: 8 }}>
                    {tags.map((t, i) => (
                      <Link key={i} to={`/tag/${encodeURIComponent(t)}`} style={{ textDecoration: 'none' }}>
                        <span className="tag-pill">{t}</span>
                      </Link>
                    ))}
                  </div>
                ) : null;
              })()}
            </div>
          ))
        ) : (
          <p>No posts yet. Be the first to create one!</p>
        )}
      </section>
    </div>
  );
};

export default HomePage;