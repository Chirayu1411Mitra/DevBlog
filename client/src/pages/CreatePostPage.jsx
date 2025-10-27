import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/ToastContext';
import TagInput from '../components/TagInput';

// Backend API URL (set VITE_API_URL in production). Fallback to localhost for dev.
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:6969/api';

const CreatePostPage = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState([]);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const { addToast } = useToast();

  const handleSubmit = async (e, publish = true) => {
    e && e.preventDefault();
    if (!token) {
      addToast('You must be logged in to create a post.', { type: 'error' });
      navigate('/login');
      return;
    }

    try {
  const res = await axios.post(`${API_URL}/posts`, { title, content, draft: publish ? false : true, tags }, { headers: { Authorization: `Bearer ${token}` }, withCredentials: true });
      if (publish) {
        addToast('Post published!', { type: 'success' });
        navigate(`/post/${res.data.id}`);
      } else {
        addToast('Draft saved.', { type: 'info' });
        // after saving a draft send user to their drafts page
        navigate('/my-drafts');
      }
    } catch (error) {
      console.error('Failed to create post:', error);
      addToast(error.response?.data?.message || 'Error creating post.', { type: 'error' });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="fade-in">
      <h2>Create New Post</h2>
      <div>
        <label htmlFor="title">Title</label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          style={{ width: '100%', padding: '8px', marginBottom: '1rem' }}
        />
      </div>
      <div>
        <label htmlFor="content">Content (Markdown supported)</label>
        <textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          rows={15}
          style={{ width: '100%', padding: '8px' }}
        />
      </div>
      <div style={{ marginTop: '1rem' }}>
        <label>Tags</label>
        <TagInput value={tags} onChange={setTags} />
      </div>
      <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
        <button className="btn" type="button" onClick={(e) => handleSubmit(e, false)}>Save draft</button>
        <button className="btn" type="submit" onClick={(e) => handleSubmit(e, true)}>Publish</button>
        <a href="/user" style={{ alignSelf: 'center', marginLeft: 'auto' }}>My drafts</a>
      </div>
    </form>
  );
};

export default CreatePostPage;