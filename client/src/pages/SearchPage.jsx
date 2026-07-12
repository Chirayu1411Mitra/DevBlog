import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import PostCard from '../components/PostCard';
import Loader from '../components/Loader';
import { Search, Hash } from 'lucide-react';
import { TagBadge } from '../components/DesignSystem';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:6969/api';

const SearchPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tags, setTags] = useState([]);
  const [searched, setSearched] = useState(false);
  const navigate = useNavigate();
  const token = document.cookie.includes('isLoggedIn=true');

  useEffect(() => {
    // Fetch all popular tags for the explore section
    axios.get(`${API_URL}/posts/tags/popular`)
      .then(res => setTags(res.data.map(t => t.tag)))
      .catch(console.error);
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (!searchTerm.trim()) {
        setPosts([]);
        setSearched(false);
        return;
      }
      setLoading(true);
      setSearched(true);
      try {
        const response = await axios.get(`${API_URL}/posts/search?q=${encodeURIComponent(searchTerm.trim())}`);
        setPosts(response.data);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, token]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="text-3xl font-bold mb-8 text-foreground" style={{ fontFamily: "var(--font-display)" }}>Search & Explore</h1>
      
      <div className="relative mb-12">
        <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search for articles, tutorials, or ideas..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-input-background text-foreground placeholder:text-muted-foreground rounded-xl pl-12 pr-4 py-4 text-base border border-transparent focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
          autoFocus
        />
      </div>

      {!searched ? (
        <div>
          <div className="flex items-center gap-2 mb-6">
            <Hash size={18} className="text-primary" />
            <h2 className="text-xl font-semibold text-foreground" style={{ fontFamily: "var(--font-display)" }}>Popular Tags</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <TagBadge key={t} label={t} onClick={() => navigate(`/tag/${encodeURIComponent(t)}`)} />
            ))}
            {tags.length === 0 && <p className="text-muted-foreground">No tags found.</p>}
          </div>
        </div>
      ) : (
        <div>
          <h2 className="text-xl font-semibold mb-6 text-foreground" style={{ fontFamily: "var(--font-display)" }}>
            Search Results for "{searchTerm}"
          </h2>
          
          {loading ? (
            <div className="flex justify-center py-12"><Loader /></div>
          ) : posts.length > 0 ? (
            <div className="grid sm:grid-cols-2 gap-4">
              {posts.map(p => <PostCard key={p.id} post={p} token={token} />)}
            </div>
          ) : (
            <div className="py-20 text-center bg-card border border-border rounded-lg">
              <Search size={32} className="text-muted-foreground mx-auto mb-3 opacity-30" />
              <p className="text-foreground font-medium mb-1">No results found</p>
              <p className="text-sm text-muted-foreground">We couldn't find anything matching your search.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchPage;
