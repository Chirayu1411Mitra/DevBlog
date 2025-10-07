import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Navbar = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  // naive decode to show username if stored elsewhere later; keep it optional
  const username = null;

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  // Theme toggle
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  return (
    <nav className="site-shell" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
      <div className="brand">
        <Link to="/" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center' }}>
          <span className="logo"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 3L19 12L5 21V3Z" fill="#536dfe"/></svg></span>
          <h1 style={{ margin: 0, marginLeft: 10 }}>BlogSpace</h1>
        </Link>
        <Link to="/" style={{ marginLeft: 12 }}>Home</Link>
      </div>

      <div className="nav-ctas">
        <button onClick={toggleTheme} className="btn" title="Toggle theme">{theme === 'dark' ? 'Light' : 'Dark'}</button>
        {token ? (
          <>
            <Link to="/create" className="btn">Write</Link>
            <Link to="/user" className="btn">{username || 'Me'}</Link>
            <button onClick={handleLogout} className="btn">Logout</button>
          </>
        ) : (
          <>
            <Link to="/login">Sign in</Link>
            <Link to="/register" className="btn signup">Sign up</Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;