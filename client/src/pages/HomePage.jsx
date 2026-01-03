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

  // Debounced search effect
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      setLoading(true);
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        let url = `${API_URL}/posts/top`; // Default to top 5 posts

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
    }, 500); // 500ms debounce

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, token]);

  // Initial data fetch (tags only)
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

  const heroLoggedOut = (
    <section className="hero-section">
      <div className="hero-content">
        <h2>Welcome to Dev Blog</h2>
        <p>Discover insightful articles, tutorials, and stories from developers around the world. Join our community to start sharing your knowledge!</p>
        <div className="hero-buttons">
          <button className="btn btn-primary" onClick={() => navigate('/register')}>Get Started Free</button>
          <button className="btn btn-secondary" onClick={() => navigate('/login')}>Sign In</button>
        </div>
      </div>
    </section>
  );

  const headerLoggedIn = (
    <div className="explore-header">
      <h2>Discover Stories and Ideas</h2>
    </div>
  );

  if (loading && posts.length === 0) {
    return <Loader />;
  }

  return (
    <div className="home-page">
      {token ? null : heroLoggedOut}
      <main className="home-layout">
        <div className="posts-column">
          {token ? headerLoggedIn : <h3 className="explore-header">Explore Articles</h3>}
          <div className="search-bar">
            <i className="fas fa-search"></i>
            <input
              type="text"
              placeholder="Search articles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="feed-toggle">
            <button className="btn-tab active">{searchTerm ? 'Search Results' : 'Top 5 Liked'}</button>
          </div>

          {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}

          <div className="post-list">
            {posts.length > 0 ? (
              posts.map(post => <PostCard key={post.id} post={post} token={token} />)
            ) : (
              !loading && <p style={{ textAlign: 'center', padding: '2rem' }}>No posts found.</p>
            )}
          </div>
        </div>
        <aside className="sidebar-column">
          {!token && <JoinCard />}
          <PopularTags tags={popularTags} />
          <StartWritingCard />
        </aside>
      </main>
      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
    </div>
  );
};

const JoinCard = () => {
  const navigate = useNavigate();
  return (
    <div className="sidebar-card">
      <div className="card-icon"><i className="fas fa-user-plus"></i></div>
      <h4>Join Dev Blog</h4>
      <p>Create an account to like, bookmark, comment, and write your own posts!</p>
      <button className="btn btn-dark" onClick={() => navigate('/register')}>Create Account</button>
      <button className="btn btn-link" onClick={() => navigate('/login')}>Sign In</button>
    </div>
  );
};

const PopularTags = ({ tags }) => {
  const token = sessionStorage.getItem('token');
  const [showLoginModal, setShowLoginModal] = useState(false);

  const handleTagClick = (tag, e) => {
    if (!token) {
      e.preventDefault();
      setShowLoginModal(true);
    }
  };

  return (
    <>
      <div className="sidebar-card">
        <h4>Popular Tags</h4>
        <ul className="tag-list">
          {tags.map(tag => (
            <li key={tag.tag}>
              <Link
                to={`/tag/${tag.tag}`}
                onClick={(e) => handleTagClick(tag.tag, e)}
              >
                #{tag.tag}
              </Link>
              <span>{tag.count}</span>
            </li>
          ))}
        </ul>
        {!token && <button className="btn btn-link">Sign in to filter posts by tags</button>}
      </div>
      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
    </>
  );
};

const StartWritingCard = () => {
  const navigate = useNavigate();
  return (
    <div className="sidebar-card cta-card">
      <h4>Start Writing</h4>
      <p>Share your knowledge with the developer community.</p>
      <button className="btn btn-light" onClick={() => navigate('/create')}>Get Started</button>
    </div>
  );
};

export default HomePage;