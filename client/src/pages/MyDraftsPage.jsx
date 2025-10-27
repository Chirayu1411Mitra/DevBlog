import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '../components/ToastContext';

export default function MyDraftsPage(){
  const [drafts, setDrafts] = useState([]);
  const token = localStorage.getItem('token');
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    const fetch = async () => {
      if (!token) { navigate('/login'); return; }
      try {
        const api = (import.meta.env.VITE_API_URL || 'http://localhost:6969/api').replace(/\/$/, '');
        const res = await axios.get(`${api}/posts/my-drafts`, { headers: { Authorization: `Bearer ${token}` }, withCredentials: true });
        setDrafts(res.data);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load drafts');
      }
    };
    fetch();
  }, []);

  const publish = async (id) => {
    try {
      const api = (import.meta.env.VITE_API_URL || 'http://localhost:6969/api').replace(/\/$/, '');
      const token = localStorage.getItem('token');
      await axios.post(`${api}/posts/${id}/publish`, {}, { headers: { Authorization: `Bearer ${token}` }, withCredentials: true });
      toast.success('Published');
      setDrafts((d) => d.filter(x => x.id !== id));
    } catch (err) {
      console.error(err);
      toast.error('Failed to publish');
    }
  };

  return (
    <div className="page-container">
      <h2>My Drafts</h2>
      {drafts.length === 0 ? <p>No drafts</p> : (
        drafts.map(d => (
          <div key={d.id} className="post-card">
            <h3>{d.title}</h3>
            <p>{d.content.slice(0,200)}...</p>
            {(() => {
              const tags = Array.isArray(d.tags) ? d.tags : (d.tags ? [d.tags] : []);
              return tags.length > 0 ? (
                <div style={{ margin: '0.5rem 0' }}>
                  {tags.map((t, i) => (
                    <Link key={i} to={`/tag/${encodeURIComponent(t)}`} style={{ textDecoration: 'none' }}>
                      <span style={{ display: 'inline-block', background: '#2b2b2b', color: '#fff', padding: '4px 8px', borderRadius: 999, marginRight: 8, fontSize: '0.85rem' }}>{t}</span>
                    </Link>
                  ))}
                </div>
              ) : null;
            })()}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn" onClick={() => navigate(`/post/${d.id}/edit`)}>Edit</button>
              <button className="btn" onClick={() => publish(d.id)}>Publish</button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
