import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Sun, Moon, Menu, X, Plus, User, LogOut, Terminal, BarChart2, Zap } from 'lucide-react';
import { cn } from '../utils';
import { Avi } from './DesignSystem';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:6969/api';

const Header = () => {
  const [user, setUser] = useState(null);
  const [mobile, setMobile] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const [dark, setDark] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const token = document.cookie.includes('isLoggedIn=true');
  const menuRef = useRef(null);

  useEffect(() => {
    const fetchUser = async () => {
      if (token) {
        try {
          const res = await axios.get(`${API_URL}/auth/me`);
          setUser(res.data.user);
        } catch (error) {
          console.error('Failed to fetch user', error);
          if (error.response && error.response.status === 401) {
            document.cookie = 'isLoggedIn=; Max-Age=0; path=/';
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
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    axios.post(`${API_URL}/auth/logout`);
    document.cookie = 'isLoggedIn=; Max-Age=0; path=/';
    setUser(null);
    setUserMenu(false);
    navigate('/');
  };

  const navLink = (label, path) => (
    <Link
      to={path}
      onClick={() => setMobile(false)}
      className={cn(
        "inline-block px-3 py-1.5 rounded text-sm transition-colors",
        location.pathname === path
          ? "bg-secondary text-foreground font-medium"
          : "text-muted-foreground hover:text-foreground hover:bg-secondary"
      )}
    >
      {label}
    </Link>
  );

  return (
    <nav className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="w-7 h-7 rounded bg-primary/10 flex items-center justify-center">
              <Terminal size={14} className="text-primary" />
            </div>
            <span className="font-semibold text-foreground text-[15px]" style={{ fontFamily: "var(--font-display)" }}>
              DevBlog
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden sm:flex items-center gap-6">
            {navLink("Home", "/")}
            {navLink("Search", "/tags")}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                setDark(!dark);
                document.documentElement.classList.toggle('dark');
              }}
              className="p-2 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              aria-label="Toggle theme"
            >
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {user ? (
              <>
                <button
                  onClick={() => navigate('/create')}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary hover:bg-accent rounded transition-colors"
                >
                  <Plus size={14} />
                  Write
                </button>

                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setUserMenu(!userMenu)}
                    className="flex items-center gap-1.5"
                  >
                    {user.avatar_url ? (
                       <img
                         src={user.avatar_url.startsWith('/uploads') ? `${API_URL.replace('/api', '')}${user.avatar_url}` : user.avatar_url}
                         alt={user.username}
                         className="w-8 h-8 rounded-full object-cover"
                       />
                    ) : (
                       <Avi initials={(user.username || '?').charAt(0).toUpperCase()} size="sm" />
                    )}
                  </button>

                  {userMenu && (
                    <div className="absolute right-0 top-10 w-52 bg-card border border-border rounded-lg shadow-xl py-1.5 z-50">
                      <div className="px-3 py-2 border-b border-border mb-1">
                        <div className="text-sm font-medium">{user.username}</div>
                      </div>
                      <button onClick={() => { navigate(`/user/${user.username}`); setUserMenu(false); }} className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-foreground hover:bg-secondary transition-colors">
                        <span className="text-muted-foreground"><User size={14} /></span> Profile
                      </button>
                      <button onClick={() => { navigate('/my-drafts'); setUserMenu(false); }} className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-foreground hover:bg-secondary transition-colors">
                        <span className="text-muted-foreground"><BarChart2 size={14} /></span> Dashboard
                      </button>
                      <button onClick={() => { navigate('/saved-posts'); setUserMenu(false); }} className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-foreground hover:bg-secondary transition-colors">
                        <span className="text-muted-foreground"><Zap size={14} /></span> Saved Posts
                      </button>
                      <div className="border-t border-border mt-1 pt-1">
                        <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 transition-colors">
                          <LogOut size={14} /> Sign out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <button onClick={() => navigate('/login')} className="px-3 py-1.5 text-sm font-medium text-foreground hover:bg-secondary rounded transition-colors">
                  Sign in
                </button>
                <button onClick={() => navigate('/register')} className="px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 rounded transition-colors">
                  Get started
                </button>
              </div>
            )}

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobile(!mobile)}
              className="sm:hidden p-2 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              {mobile ? <X size={16} /> : <Menu size={16} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobile && (
          <div className="sm:hidden border-t border-border py-2 flex flex-col gap-0.5">
            <Link to="/" onClick={() => setMobile(false)} className="text-left px-3 py-2 text-sm text-foreground hover:bg-secondary rounded transition-colors">Home</Link>
            <Link to="/tags" onClick={() => setMobile(false)} className="text-left px-3 py-2 text-sm text-foreground hover:bg-secondary rounded transition-colors">Search</Link>
            {user ? (
              <>
                <Link to="/create" onClick={() => setMobile(false)} className="text-left px-3 py-2 text-sm text-foreground hover:bg-secondary rounded transition-colors">Write</Link>
                <button onClick={handleLogout} className="text-left px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded transition-colors">Sign out</button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setMobile(false)} className="text-left px-3 py-2 text-sm text-foreground hover:bg-secondary rounded transition-colors">Sign in</Link>
                <Link to="/register" onClick={() => setMobile(false)} className="text-left px-3 py-2 text-sm text-primary hover:bg-secondary rounded transition-colors">Get started</Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Header;
