import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Plus, Edit3, Trash2 } from 'lucide-react';
import Loader from '../components/Loader';
import { Btn, TagBadge } from '../components/DesignSystem';
import ConfirmModal from '../components/ConfirmModal';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:6969/api';

export default function MyDraftsPage() {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = document.cookie.includes('isLoggedIn=true');
  const navigate = useNavigate();
  const [feedbackMessage, setFeedbackMessage] = useState(null);
  const [feedbackType, setFeedbackType] = useState('info');
  const [draftToDelete, setDraftToDelete] = useState(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  useEffect(() => {
    const fetchDrafts = async () => {
      if (!token) {
        navigate('/login');
        return;
      }
      try {
        const res = await axios.get(`${API_URL}/posts/my-drafts`);
        setDrafts(res.data);
      } catch (err) {
        console.error(err);
        setFeedbackMessage('Failed to load drafts');
        setFeedbackType('error');
      } finally {
        setLoading(false);
      }
    };
    fetchDrafts();
  }, [token, navigate]);

  const initiateDelete = (id) => {
    setDraftToDelete(id);
    setIsConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!draftToDelete) return;
    try {
      await axios.delete(`${API_URL}/posts/${draftToDelete}`);
      setDrafts((d) => d.filter((x) => x.id !== draftToDelete));
      setFeedbackMessage('Draft deleted');
      setFeedbackType('success');
    } catch (err) {
      console.error(err);
      setFeedbackMessage('Failed to delete draft');
      setFeedbackType('error');
    } finally {
      setIsConfirmOpen(false);
      setDraftToDelete(null);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader /></div>;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {feedbackMessage && (
        <div className={`mb-6 p-4 rounded text-sm font-medium ${feedbackType === 'error' ? 'bg-destructive/10 text-destructive' : 'bg-emerald-500/10 text-emerald-500'}`} onClick={() => setFeedbackMessage(null)}>
          {feedbackMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-1">Dashboard</p>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>My Drafts</h1>
          <p className="text-sm text-muted-foreground mt-1">You have {drafts.length} unpublished articles</p>
        </div>
        <Btn variant="primary" icon={<Plus size={15} />} onClick={() => navigate('/create')}>New article</Btn>
      </div>

      {/* Drafts List */}
      <div className="space-y-4">
        {drafts.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <p className="text-muted-foreground mb-4">You have no drafts yet.</p>
            <Btn variant="outline" onClick={() => navigate('/create')}>Start Writing</Btn>
          </div>
        ) : (
          drafts.map((d) => (
            <div key={d.id} className="bg-card border border-border rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors hover:border-primary/30 hover:shadow-sm">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-foreground mb-2" style={{ fontFamily: "var(--font-display)" }}>
                  {d.title || 'Untitled Draft'}
                </h3>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2 leading-relaxed">
                  {(d.content || '').slice(0, 150)}...
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs text-muted-foreground font-mono">
                    Last edited {format(new Date(d.updated_at), 'MMM d, yyyy')}
                  </span>
                  {d.tags && d.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {d.tags.map((t) => (
                        <TagBadge key={t} label={t} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex sm:flex-col gap-2">
                <Btn variant="secondary" size="sm" icon={<Edit3 size={14} />} onClick={() => navigate(`/post/${d.id}${d.slug ? `-${d.slug}` : ''}/edit`)}>
                  Edit
                </Btn>
                <Btn variant="danger" size="sm" icon={<Trash2 size={14} />} onClick={() => initiateDelete(d.id)}>
                  Delete
                </Btn>
              </div>
            </div>
          ))
        )}
      </div>

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Draft"
        message="Are you sure you want to delete this draft? This action cannot be undone."
        confirmText="Delete"
        type="danger"
      />
    </div>
  );
}
