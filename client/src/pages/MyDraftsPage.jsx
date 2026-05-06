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
    <div className="main-container" style={{ marginTop: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>My Drafts</h2>
          <p style={{ color: 'var(--text-muted)' }}>You have {drafts.length} drafts</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/create')}>
          <i className="fas fa-plus"></i> New Post
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {drafts.length === 0 ? (
          <div className="card text-center" style={{ padding: '4rem 2rem' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>You have no drafts.</p>
            <button className="btn btn-secondary" style={{ marginTop: '1.5rem' }} onClick={() => navigate('/create')}>Start Writing</button>
          </div>
        ) : (
          drafts.map((d) => (
            <div key={d.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', padding: '1.5rem', alignItems: 'center' }}>
              <div style={{ flex: 1, paddingRight: '2rem' }}>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{d.title || 'Untitled Draft'}</h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '.95rem' }}>{(d.content || '').slice(0, 120)}...</p>
                <div style={{ display: 'flex', gap: '1.25rem', color: 'var(--text-dim)', fontSize: '0.85rem', alignItems: 'center' }}>
                  <span>
                    <i className="far fa-calendar-alt" style={{ marginRight: '6px' }}></i>
                    Last edited {format(new Date(d.updated_at), 'MMM d, yyyy')}
                  </span>
                  <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                    {(d.tags || []).map((t) => (
                      <span key={t} className="tag-pill">#{t}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/post/${d.id}/edit`)} title="Edit Draft">
                  <i className="fas fa-pencil-alt"></i>
                </button>
                <button className="btn btn-outline-danger btn-sm" onClick={() => deleteDraft(d.id)} title="Delete Draft">
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
