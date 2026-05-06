import React, { useState, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/ToastContext';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:6969/api';

const CreatePostPage = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState([]);
  const [currentTag, setCurrentTag] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const token = sessionStorage.getItem('token');
  const { addToast } = useToast();

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

  const handleSubmit = async (isDraft) => {
    if (!token) {
      addToast('You must be logged in.', { type: 'error' });
      navigate('/login');
      return;
    }
    try {
      const res = await axios.post(`${API_URL}/posts`, { title, content, draft: isDraft, tags, cover_image_url: coverImageUrl }, { 
        headers: { Authorization: `Bearer ${token}` }
      });
      if (isDraft) {
        addToast('Draft saved.', { type: 'info' });
        navigate('/my-drafts');
      } else {
        addToast('Post published!', { type: 'success' });
        navigate(`/post/${res.data.id}`);
      }
    } catch (error) {
      console.error('Failed to create post:', error);
      addToast(error.response?.data?.message || 'Error creating post.', { type: 'error' });
    }
  };

  return (
    <div className="reading-container" style={{ marginTop: '2rem' }}>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h2>Create New Post</h2>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn btn-secondary" onClick={() => handleSubmit(true)}>Save Draft</button>
            <button className="btn btn-primary" onClick={() => handleSubmit(false)}>Publish</button>
          </div>
        </div>

        <div className="editor-form">
          <div className="editor-form-group">
            <label htmlFor="cover-image">Cover Image</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
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
              <span className="upload-hint">Max size: 5MB (JPG, PNG, WebP)</span>
            </div>
            {coverImageUrl && (
              <div className="image-preview">
                <img src={`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:6969'}${coverImageUrl}`} alt="Cover Preview" />
              </div>
            )}
          </div>

          <div className="editor-form-group">
            <label htmlFor="title">Title</label>
            <input
              type="text"
              id="title"
              className="editor-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter your post title..."
              required
            />
          </div>

          <div className="editor-form-group">
            <label htmlFor="tags">Tags</label>
            <div className="tag-input-container">
              <input
                type="text"
                id="tags"
                className="editor-input"
                value={currentTag}
                onChange={(e) => setCurrentTag(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                placeholder="Add a tag..."
              />
              <button type="button" className="btn btn-dark" onClick={handleAddTag}>Add</button>
            </div>
            <div className="tag-list-editor">
              {tags.map((tag, index) => (
                <span key={index} className="tag-pill-editor">
                  #{tag} <button onClick={() => handleRemoveTag(tag)}>&times;</button>
                </span>
              ))}
            </div>
          </div>

          <div className="editor-form-group">
            <label htmlFor="content">Content</label>
            <textarea
              id="content"
              className="editor-textarea"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your post content here... (Markdown supported)"
              rows={15}
              required
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatePostPage;