import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import PostCard from '../components/PostCard';
import Loader from '../components/Loader';
import { Search, Hash } from 'lucide-react';
import { Btn, TagBadge } from '../components/DesignSystem';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:6969/api';

export default function TagPage(){
  const { tag } = useParams();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = document.cookie.includes('isLoggedIn=true');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const res = await axios.get(`${API_URL}/posts/tag/${encodeURIComponent(tag)}`);
        setPosts(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, [tag, token]);

  if (loading) return <div className="flex justify-center py-20"><Loader /></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2 text-primary">
          <Hash size={24} />
          <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>{tag}</h1>
        </div>
        <p className="text-sm font-mono text-muted-foreground">
          {posts.length} {posts.length === 1 ? 'post' : 'posts'} tagged with "{tag}"
        </p>
      </div>

      {/* Results count */}
      <p className="text-xs font-mono text-muted-foreground mb-4">
        {posts.length} result{posts.length !== 1 ? "s" : ""}
      </p>

      {/* Results */}
      {posts.length === 0 ? (
        <div className="py-20 text-center bg-card border border-border rounded-lg">
          <Search size={32} className="text-muted-foreground mx-auto mb-3 opacity-30" />
          <p className="text-foreground font-medium mb-1">No results found</p>
          <p className="text-sm text-muted-foreground mb-6">No posts have been published with this tag yet.</p>
          <Btn variant="primary" onClick={() => navigate('/')}>Back to Home</Btn>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {posts.map(p => (
            <PostCard key={p.id} post={p} />
          ))}
        </div>
      )}
    </div>
  );
}
