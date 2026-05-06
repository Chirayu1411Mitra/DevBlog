import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import PostCard from '../components/PostCard';
import LoginModal from '../components/LoginModal';
import Loader from '../components/Loader';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:6969/api';

const HomePage = () => {
  const [posts, setPosts] = useState([]);
  const [popularTags, setPopularTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const navigate = useNavigate();
  const token = sessionStorage.getItem('token');

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      setLoading(true);
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        let url = `${API_URL}/posts/top`;

        if (searchTerm.trim()) {
          url = `${API_URL}/posts/search?q=${encodeURIComponent(searchTerm.trim())}`;
        }

        const response = await axios.get(url, { headers });
        setPosts(response.data);
        setError(null);
      } catch (err) {
        console.error('Search error:', err);
        setError('Failed to fetch posts.');
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, token]);

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const response = await axios.get(`${API_URL}/posts/tags/popular`);
        setPopularTags(response.data);
      } catch (err) {
        console.error('Failed to fetch tags:', err);
      }
    };
    fetchTags();
  }, []);

  const handleTagClick = (tag, e) => {
    if (!token) {
      e.preventDefault();
      setShowLoginModal(true);
    }
  };

  const heroLoggedOut = (
    <section className="hero-section">
      <div className="hero-content">
        <h2>Where developers write & learn</h2>
        <p>Discover insightful articles, tutorials, and stories from developers around the world. Join our community to start sharing your knowledge.</p>
        <div className="hero-buttons">
          <button className="btn btn-primary" onClick={() => navigate('/register')}>Get Started Free</button>
          <button className="btn btn-secondary" onClick={() => navigate('/login')}>Sign In</button>
        </div>
      </div>
    </section>
  );

  return (
    <div className="home-page">
      {!token && heroLoggedOut}
      
      <div className="search-container">
        <i className="fas fa-search"></i>
        <input
          type="text"
          placeholder="Search for articles, tutorials, or ideas..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {popularTags.length > 0 && (
        <div className="popular-tags-bar">
          {popularTags.map(tag => (
            <Link
              key={tag.tag}
              to={`/tag/${tag.tag}`}
              className="tag-pill"
              onClick={(e) => handleTagClick(tag.tag, e)}
            >
              #{tag.tag} ({tag.count})
            </Link>
          ))}
        </div>
      )}

      <div className="post-grid-header">
        <h3>{searchTerm ? 'Search Results' : 'Top Stories'}</h3>
      </div>

      {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}
      
      {loading && posts.length === 0 ? (
        <Loader />
      ) : (
        <div className="post-grid">
          {posts.length > 0 ? (
            posts.map(post => <PostCard key={post.id} post={post} token={token} />)
          ) : (
            <p style={{ textAlign: 'center', gridColumn: '1 / -1', padding: '3rem', color: 'var(--text-light)' }}>
              No posts found. Try another search.
            </p>
          )}
        </div>
      )}

      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
    </div>
  );
};

export default HomePage;