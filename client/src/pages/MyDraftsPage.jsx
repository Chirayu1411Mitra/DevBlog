import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '../components/ToastContext';
import { format } from 'date-fns';
import Loader from '../components/Loader';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:6969/api';

export default function MyDraftsPage() {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = sessionStorage.getItem('token');
  const navigate = useNavigate();
  const { addToast } = useToast();

  useEffect(() => {
    const fetchDrafts = async () => {
      if (!token) {
        navigate('/login');
        return;
      }
      try {
        const res = await axios.get(`${API_URL}/posts/my-drafts`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setDrafts(res.data);
      } catch (err) {
        console.error(err);
        addToast('Failed to load drafts', { type: 'error' });
      } finally {
        setLoading(false);
      }
    };
    fetchDrafts();
  }, [token, navigate, addToast]);

  const deleteDraft = async (id) => {
    if (window.confirm('Are you sure you want to delete this draft?')) {
      try {
        await axios.delete(`${API_URL}/posts/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setDrafts((d) => d.filter((x) => x.id !== id));
        addToast('Draft deleted', { type: 'success' });
      } catch (err) {
        console.error(err);
        addToast('Failed to delete draft', { type: 'error' });
      }
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="drafts-page-container">
      <div className="drafts-header">
        <div>
          <h2>My Drafts</h2>
          <p>You have {drafts.length} drafts</p>
        </div>
        <button className="btn btn-dark" onClick={() => navigate('/create')}>
          <i className="fas fa-plus"></i> New Post
        </button>
      </div>

      <div className="drafts-list">
        {drafts.length === 0 ? (
          <p>You have no drafts.</p>
        ) : (
          drafts.map((d) => (
            <div key={d.id} className="draft-card">
              <div className="draft-card-content">
                <h3>{d.title}</h3>
                <p>{(d.content || '').slice(0, 100)}...</p>
                <div className="draft-meta">
                  <i className="far fa-calendar-alt"></i>
                  <span>Last edited {format(new Date(d.updated_at), 'MMM d, yyyy')}</span>
                </div>
                <div className="draft-tags">
                  {(d.tags || []).map((t) => (
                    <span key={t} className="tag-pill">#{t}</span>
                  ))}
                </div>
              </div>
              <div className="draft-card-actions">
                <button className="btn-icon" onClick={() => navigate(`/post/${d.id}/edit`)}>
                  <i className="fas fa-pencil-alt"></i>
                </button>
                <button className="btn-icon" onClick={() => deleteDraft(d.id)}>
                  <i className="fas fa-trash-alt"></i>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
