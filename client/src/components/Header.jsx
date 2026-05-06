import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:6969/api';

const Header = () => {
  const [user, setUser] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const token = sessionStorage.getItem('token');
  const dropdownRef = useRef(null);

  useEffect(() => {
    const fetchUser = async () => {
      if (token) {
        try {
          const res = await axios.get(`${API_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setUser(res.data.user);
        } catch (error) {
          console.error('Failed to fetch user', error);
          // Handle expired token
          if (error.response && error.response.status === 401) {
            sessionStorage.removeItem('token');
            setUser(null);
          }
        }
      } else {
        setUser(null);
      }
    };
    fetchUser();
  }, [token]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem('token');
    setUser(null);
    setDropdownOpen(false);
    navigate('/login');
  };

  return (
    <header className="main-header">
      <div className="header-container">
        <Link to="/" className="header-logo">
          <i className="fas fa-feather-alt"></i>
          <span>DevBlog</span>
        </Link>
        <nav className="header-nav">
          {user ? (
            <>
              <button className="btn btn-primary" style={{ borderRadius: '99px', padding: '.5rem 1.25rem' }} onClick={() => navigate('/create')}>
                <i className="fas fa-pen"></i> Write
              </button>
              <div className="profile-menu" ref={dropdownRef}>
                <button className="profile-avatar-btn" onClick={() => setDropdownOpen(!dropdownOpen)}>
                  {user.avatar_url ? (
                    <img src={user.avatar_url.startsWith('/uploads') ? `${API_URL.replace('/api', '')}${user.avatar_url}` : user.avatar_url} alt={user.username} className="profile-avatar-img" />
                  ) : (
                    <span className="profile-avatar-initial">
                      {(user.username || '?').charAt(0).toUpperCase()}
                    </span>
                  )}
                </button>
                {dropdownOpen && (
                  <div className="dropdown-menu">
                    <Link to={`/user/${user.username}`} className="dropdown-item" onClick={() => setDropdownOpen(false)}>
                      <i className="fas fa-user-circle"></i> Profile
                    </Link>
                    <Link to="/my-drafts" className="dropdown-item" onClick={() => setDropdownOpen(false)}>
                      <i className="fas fa-file-alt"></i> My Drafts
                    </Link>
                    <Link to="/saved-posts" className="dropdown-item" onClick={() => setDropdownOpen(false)}>
                      <i className="fas fa-bookmark"></i> Saved Posts
                    </Link>
                    <div className="dropdown-divider"></div>
                    <button onClick={handleLogout} className="dropdown-item" style={{ color: 'var(--danger)' }}>
                      <i className="fas fa-sign-out-alt"></i> Log out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <button className="btn btn-secondary" onClick={() => navigate('/login')}>Sign In</button>
              <button className="btn btn-primary" onClick={() => navigate('/register')}>Get Started</button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
