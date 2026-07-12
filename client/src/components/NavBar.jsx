import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Navbar = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

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
    <nav className="site-shell flex justify-between items-center mb-6">
      <div className="brand">
        <Link to="/" className="flex items-center text-text no-underline">
          <span className="logo"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 3L19 12L5 21V3Z" fill="var(--accent)" /></svg></span>
          <h1 className="ml-2.5 font-bold text-text">DevBlog</h1>
        </Link>
      </div>

      <div className="nav-ctas flex items-center gap-2">
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
              className="icon-btn w-9 h-9 rounded-full flex items-center justify-center border border-border bg-surface text-text cursor-pointer"
              onClick={openMenu}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5zm0 2c-4.418 0-8 2.239-8 5v1h16v-1c0-2.761-3.582-5-8-5z" fill="currentColor" />
              </svg>
            </button>
          </>
        ) : (
          <>
            <Link to="/login">Sign in</Link>
            <Link to="/register" className="btn btn-primary ml-4">Sign up</Link>
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
              <div className="font-bold text-text">Account</div>
              <button className="icon-btn" onClick={closeMenu} aria-label="Close menu">×</button>
            </div>
            <div className="sidepanel-content">
              <button className="sidepanel-item flex w-full items-center pl-4 pr-4" onClick={() => goTo('/user')}>
                <span>Profile</span>
              </button>
              <button className="sidepanel-item flex w-full items-center pl-4 pr-4" onClick={() => goTo('/my-drafts')}>
                <span>Drafts</span>
              </button>
              <hr className="sidepanel-sep my-4" />
              <button className="sidepanel-item flex w-full items-center pl-4 pr-4 text-danger" onClick={() => { closeMenu(); handleLogout(); }}>
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