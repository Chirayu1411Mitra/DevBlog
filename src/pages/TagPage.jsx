import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';

export default function TagPage(){
  const { tag } = useParams();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const api = (import.meta.env.VITE_API_URL || 'http://localhost:6969/api').replace(/\/$/, '');
        const res = await axios.get(`${api}/posts/tag/${encodeURIComponent(tag)}`);
        setPosts(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [tag]);

  if (loading) return <div className="skeleton" />;
  return (
    <div className="page-container">
      <h2>Posts tagged: {tag}</h2>
      {posts.length === 0 ? <p>No posts</p> : posts.map(p => (
        <div key={p.id} className="post-card">
          <h3><Link to={`/post/${p.id}`}>{p.title}</Link></h3>
          <p>by {p.username}</p>
        </div>
      ))}
    </div>
  );
}
