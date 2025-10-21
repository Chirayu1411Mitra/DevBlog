import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios'; // Or your API client

// Helper to get API URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://devblog-b.onrender.com/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null); // Optional: store user details
  const [loading, setLoading] = useState(true); // Track initial loading
  const navigate = useNavigate();
  const location = useLocation();

  // Function to save token and potentially fetch user data
  const login = async (newToken) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    // Optional: Fetch user details after getting token
    try {
      const api = API_BASE_URL.replace(/\/$/, '');
      const res = await axios.get(`${api}/auth/me`, {
        headers: { Authorization: `Bearer ${newToken}` },
      });
      setUser(res.data.user);
    } catch (error) {
      console.error("Failed to fetch user after login", error);
      setUser(null); // Clear user data on error
    }
  };

  // Function to clear token and user data
  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    navigate('/login'); // Redirect to login after logout
  };

  // Effect to check token validity and fetch user on initial load
  useEffect(() => {
    const checkAuth = async () => {
      setLoading(true);
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        setToken(storedToken);
        try {
          const api = API_BASE_URL.replace(/\/$/, '');
          const res = await axios.get(`${api}/auth/me`, {
            headers: { Authorization: `Bearer ${storedToken}` },
          });
          setUser(res.data.user);
          // --- Redirect Logic ---
          const loggedOutOnlyPages = ['/login', '/register'];
          if (loggedOutOnlyPages.includes(location.pathname)) {
              navigate('/', { replace: true }); // Redirect logged-in users away from login/register
          }
          // --- End Redirect ---
        } catch (error) {
          console.error("Token validation failed or user fetch failed", error);
          // Token might be invalid/expired, clear it
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
        }
      } else {
        setToken(null);
        setUser(null);
      }
      setLoading(false);
    };
    checkAuth();
  // location.pathname dependency ensures check runs if user navigates manually while state might be stale
  }, [navigate, location.pathname]);


  return (
    <AuthContext.Provider value={{ token, user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);