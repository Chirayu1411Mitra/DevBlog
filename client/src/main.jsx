import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import App from './App';
import './index.css';

axios.defaults.withCredentials = true;

// --- Global Axios Cache for Instant Page Loads ---
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const originalGet = axios.get;
axios.get = async (url, config) => {
  if (url.includes('/auth/me')) {
    return originalGet(url, config);
  }

  // If we are fetching a specific post, the backend increments the view count.
  // We clear the cache so that when the user navigates back to the feed, it fetches the updated views!
  if (url.match(/\/api\/posts\/\d+/)) {
    cache.clear();
  }

  const cacheKey = url + JSON.stringify(config?.params || {});
  
  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    // If the cache is still fresh, return it instantly!
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      return Promise.resolve(cached.response);
    }
  }

  const response = await originalGet(url, config);
  cache.set(cacheKey, { timestamp: Date.now(), response });
  return response;
};

// Invalidate the entire cache on any mutation (like, comment, create, edit)
// This ensures that after you perform an action, you instantly see fresh data.
const clearCache = () => cache.clear();
const originalPost = axios.post;
const originalPut = axios.put;
const originalDelete = axios.delete;

axios.post = async (...args) => { clearCache(); return originalPost(...args); };
axios.put = async (...args) => { clearCache(); return originalPut(...args); };
axios.delete = async (...args) => { clearCache(); return originalDelete(...args); };
// -------------------------------------------------

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);