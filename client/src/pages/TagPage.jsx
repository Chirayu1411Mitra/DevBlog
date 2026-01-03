import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import PostCard from '../components/PostCard';
import Loader from '../components/Loader';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:6969/api';

export default function TagPage(){
  const { tag } = useParams();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = sessionStorage.getItem('token');

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await axios.get(`${API_URL}/posts/tag/${encodeURIComponent(tag)}`, { headers });
        setPosts(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, [tag, token]);

  if (loading) return <Loader />;

  return (
    <div className="tag-page-container">
      <div className="tag-page-header">
        <h2>#{tag}</h2>
        <p>{posts.length} {posts.length === 1 ? 'post' : 'posts'} tagged with <strong>{tag}</strong></p>
      </div>
      <div className="post-list">
        {posts.length === 0 ? (
          <p>No posts found with this tag.</p>
        ) : (
          posts.map(p => (
            <PostCard key={p.id} post={p} token={token} />
          ))
        )}
      </div>
    </div>
  );
}
