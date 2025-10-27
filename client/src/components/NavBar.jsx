import React, { useEffect, useRef, useState } from 'react';
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

  // User menu (right mini sidebar)
  const [menuOpen, setMenuOpen] = useState(false);
  const panelRef = useRef(null);
  const overlayRef = useRef(null);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const closeMenu = () => setMenuOpen(false);
  const openMenu = () => setMenuOpen(true);

  const goTo = (path) => {
    navigate(path);
    closeMenu();
  };

  return (
    <nav className="site-shell" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
      <div className="brand">
        <Link to="/" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center' }}>
          <span className="logo"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 3L19 12L5 21V3Z" fill="var(--accent)"/></svg></span>
          <h1 style={{ margin: 0, marginLeft: 10 }}>DevBlog</h1>
        </Link>
      </div>

      <div className="nav-ctas" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <label className="theme-toggle" title="Theme" aria-label="Theme toggle">
          <input
            type="checkbox"
            checked={theme === 'light'}
            onChange={(e) => setTheme(e.target.checked ? 'light' : 'dark')}
            aria-checked={theme === 'light'}
          />
          <span className="track">
            <span className="thumb" />
          </span>
        </label>
        {token ? (
          <>
            <Link to="/create" className="btn">Write</Link>
            <button
              aria-label="Open account menu"
              className="icon-btn"
              onClick={openMenu}
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--border, #333)',
                background: 'var(--surface, #1e1e1e)',
                cursor: 'pointer'
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5zm0 2c-4.418 0-8 2.239-8 5v1h16v-1c0-2.761-3.582-5-8-5z" fill="currentColor"/>
              </svg>
            </button>
          </>
        ) : (
          <>
            <Link to="/login">Sign in</Link>
            <Link to="/register" className="btn signup">Sign up</Link>
          </>
        )}
      </div>

      {token && (
        <>
          <div
            ref={overlayRef}
            className={`sidepanel-overlay ${menuOpen ? 'show' : ''}`}
            onClick={closeMenu}
            aria-hidden={!menuOpen}
          />

          <aside
            ref={panelRef}
            className={`sidepanel ${menuOpen ? 'open' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-label="Account menu"
          >
            <div className="sidepanel-header">
              <div style={{ fontWeight: 700 }}>Account</div>
              <button className="icon-btn" onClick={closeMenu} aria-label="Close menu">×</button>
            </div>
            <div className="sidepanel-content">
              <button className="sidepanel-item" onClick={() => goTo('/user')}>
                <span>Profile</span>
              </button>
              <button className="sidepanel-item" onClick={() => goTo('/my-drafts')}>
                <span>Drafts</span>
              </button>
              <hr className="sidepanel-sep" />
              <button className="sidepanel-item danger" onClick={() => { closeMenu(); handleLogout(); }}>
                <span>Logout</span>
              </button>
            </div>
          </aside>
        </>
      )}
    </nav>
  );
};

export default Navbar;