import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '../components/ToastContext';
import TagInput from '../components/TagInput';

export default function EditPostPage(){
  const { id } = useParams();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    const fetch = async () => {
      try {
        const api = (import.meta.env.VITE_API_URL || 'https://devblog-b.onrender.com/api').replace(/\/$/, '');
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await axios.get(`${api}/posts/${id}`, { headers });
  setTitle(res.data.title);
  setContent(res.data.content);
  setTags(Array.isArray(res.data.tags) ? res.data.tags : []);
      } catch (err) {
        console.error(err);
        // Drafts require auth; provide clearer message if 401/404
        if (err.response && (err.response.status === 401 || err.response.status === 404)) {
          toast.error('Failed to load post — it may be a draft or you are not authorized');
        } else {
          toast.error('Failed to load post');
        }
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  const save = async (publish = false) => {
    setSaving(true);
    try {
      const api = (import.meta.env.VITE_API_URL || 'https://devblog-b.onrender.com/api').replace(/\/$/, '');
      const token = localStorage.getItem('token');
  await axios.put(`${api}/posts/${id}`, { title, content, draft: publish ? false : true, tags }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(publish ? 'Published' : 'Saved draft');
      navigate(publish ? `/post/${id}` : '/my-drafts');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="skeleton" style={{ height: 200 }} />;

  return (
    <div className="page-container">
      <h2>Edit Post</h2>
      <div className="form-card">
        <label>Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
        <label>Content</label>
        <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={12} />
  <label>Tags</label>
  <TagInput value={tags} onChange={setTags} />
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button className="btn" onClick={() => save(false)} disabled={saving}>{saving ? 'Saving...' : 'Save Draft'}</button>
          <button className="btn" onClick={() => save(true)} disabled={saving}>{saving ? 'Publishing...' : 'Publish'}</button>
        </div>
      </div>
    </div>
  );
}
