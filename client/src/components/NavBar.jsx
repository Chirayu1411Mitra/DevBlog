import React, { /* remove useState, remove useEffect */ useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Import useAuth

const Navbar = () => {
  const navigate = useNavigate();
  const { token, user, logout, loading } = useAuth(); // Get state and logout from context
  // remove: const token = localStorage.getItem('token');
  const username = user ? user.username : null; // Get username from context

  // Keep theme logic...
  const [theme, setTheme] = React.useState(() => localStorage.getItem('theme') || 'dark');
   React.useEffect(() => {
     document.documentElement.setAttribute('data-theme', theme);
     localStorage.setItem('theme', theme);
   }, [theme]);
   const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

   // Keep menu logic...
   const [menuOpen, setMenuOpen] = React.useState(false);
   // ... rest of menu logic ...
   const handleLogoutClick = () => {
     closeMenu();
     logout(); // Use logout from context
   };


  if (loading) {
    return <nav className="site-shell">Loading...</nav>; // Show loading state
  }

  return (
    <nav className="site-shell" /* ... styles ... */ >
      {/* ... Brand ... */}

      <div className="nav-ctas" /* ... styles ... */ >
        {/* ... Theme Toggle ... */}
        {token ? ( // Check token from context state
          <>
            <Link to="/create" className="btn">Write</Link>
            {/* ... Account Menu Button ... */}
             {username && <span style={{ marginRight: '8px' }}>Hi, {username}!</span>}
          </>
        ) : (
          <>
            <Link to="/login">Sign in</Link>
            <Link to="/register" className="btn signup">Sign up</Link>
          </>
        )}
      </div>

      {token && ( // Check token from context state
        <>
          {/* ... Sidepanel Overlay ... */}
          <aside /* ... props ... */ >
            {/* ... Sidepanel Header ... */}
            <div className="sidepanel-content">
              {/* ... Profile / Drafts buttons ... */}
              <button className="sidepanel-item danger" onClick={handleLogoutClick}> {/* Use updated handler */}
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