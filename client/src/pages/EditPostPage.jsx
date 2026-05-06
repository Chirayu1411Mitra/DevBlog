import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '../components/ToastContext';
import Loader from '../components/Loader';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:6969/api';

export default function EditPostPage() {
  const { id } = useParams();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState([]);
  const [currentTag, setCurrentTag] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [isDraft, setIsDraft] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { addToast } = useToast();
  const token = sessionStorage.getItem('token');
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await axios.get(`${API_URL}/posts/${id}`, { headers });
        setTitle(res.data.title);
        setContent(res.data.content);
        setTags(Array.isArray(res.data.tags) ? res.data.tags : []);
        setIsDraft(res.data.draft);
        setCoverImageUrl(res.data.cover_image_url || '');
      } catch (err) {
        console.error(err);
        addToast('Failed to load post for editing.', { type: 'error' });
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [id, token, addToast]);

  const handleAddTag = () => {
    if (currentTag && !tags.includes(currentTag)) {
      setTags([...tags, currentTag.toLowerCase().trim()]);
      setCurrentTag('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('type', 'blog');
    formData.append('image', file);

    try {
      const res = await axios.post(`${API_URL}/posts/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
      });
      setCoverImageUrl(res.data.imageUrl);
      addToast('Image uploaded successfully!', { type: 'success' });
    } catch (error) {
      console.error('Image upload failed:', error);
      addToast('Image upload failed.', { type: 'error' });
    }
  };

  const handleSave = async (publish) => {
    try {
      const payload = { title, content, tags, draft: !publish, cover_image_url: coverImageUrl };
      await axios.put(`${API_URL}/posts/${id}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      addToast(publish ? 'Post published!' : 'Changes saved!', { type: 'success' });
      navigate(`/post/${id}`);
    } catch (err) {
      console.error(err);
      addToast('Failed to save changes.', { type: 'error' });
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="reading-container" style={{ marginTop: '2rem' }}>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2>Edit Post</h2>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn btn-secondary" onClick={() => handleSave(false)}>Save Draft</button>
            <button className="btn btn-primary" onClick={() => handleSave(true)}>
              {isDraft ? 'Publish' : 'Save Changes'}
            </button>
          </div>
        </div>

        <div className="editor-form">
          <div className="editor-form-group">
            <label htmlFor="cover-image">Cover Image (optional)</label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              style={{ display: 'none' }}
              accept="image/*"
            />
            <button type="button" className="btn-upload" onClick={() => fileInputRef.current.click()}>
              <i className="fas fa-upload"></i> Upload Image
            </button>
            <span className="upload-hint">Max size: 5MB (JPG, PNG, GIF, WebP)</span>
            {coverImageUrl && (
              <div className="image-preview">
                <img src={`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:6969'}${coverImageUrl}`} alt="Cover preview" />
              </div>
            )}
          </div>

          <div className="editor-form-group">
            <label htmlFor="title">Title</label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter your post title..."
              className="editor-input"
              required
            />
          </div>

          <div className="editor-form-group">
            <label htmlFor="tags">Tags</label>
            <div className="tag-input-container">
              <input
                type="text"
                id="tags"
                value={currentTag}
                onChange={(e) => setCurrentTag(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                placeholder="Add a tag..."
                className="editor-input"
              />
              <button type="button" className="btn btn-dark" onClick={handleAddTag}>Add</button>
            </div>
            <div className="tag-list-editor">
              {tags.map(tag => (
                <span key={tag} className="tag-pill-editor">
                  #{tag}
                  <button onClick={() => handleRemoveTag(tag)}>&times;</button>
                </span>
              ))}
            </div>
          </div>

          <div className="editor-form-group">
            <label htmlFor="content">Content</label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your post content here... (Markdown supported)"
              className="editor-textarea"
              rows={15}
              required
            />
          </div>
        </div>
      </div>
    </div>
  );
}
