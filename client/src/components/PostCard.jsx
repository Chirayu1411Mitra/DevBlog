import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from './ToastContext';
import LoginModal from './LoginModal';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:6969/api';

const PostCard = ({ post, token }) => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [isLiked, setIsLiked] = useState(post.user_has_liked);
  const [likeCount, setLikeCount] = useState(parseInt(post.like_count, 10) || 0);
  const [isSaved, setIsSaved] = useState(post.user_has_saved);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [animating, setAnimating] = useState({ like: false, save: false });

  const readingTime = Math.ceil((post.content || '').split(' ').length / 200);

  const handleAction = async (action, e) => {
    e.stopPropagation(); // Prevent card click
    if (!token) {
      setShowLoginModal(true);
      return;
    }
    try {
      const response = await axios.post(`${API_URL}/posts/${post.id}/${action}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (action === 'like') {
        setIsLiked(response.data.liked);
        if (response.data.liked) {
          setAnimating(prev => ({ ...prev, like: true }));
          setTimeout(() => setAnimating(prev => ({ ...prev, like: false })), 300);
        }
        setLikeCount(prev => response.data.liked ? prev + 1 : prev - 1);
      } else if (action === 'save') {
        setIsSaved(response.data.saved);
        if (response.data.saved) {
          setAnimating(prev => ({ ...prev, save: true }));
          setTimeout(() => setAnimating(prev => ({ ...prev, save: false })), 300);
        }
      }
      addToast(response.data.message, { type: 'success' });
    } catch (error) {
      console.error(`Failed to ${action} post:`, error);
      addToast(error.response?.data?.message || 'Action failed', { type: 'error' });
    }
  };

  const handleTagClick = (e) => {
    if (!token) {
      e.preventDefault();
      e.stopPropagation();
      setShowLoginModal(true);
    }
  };

  const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:6969/api').replace('/api', '');

  const getImageUrl = (url) => {
    if (!url) return null;
    return url.startsWith('/uploads') ? `${API_BASE_URL}${url}` : url;
  };

  return (
    <>
      <div className="post-card-new" onClick={() => navigate(`/post/${post.id}`)}>
        {post.cover_image_url ? (
          <div className="post-card-image" style={{ backgroundImage: `url(${API_BASE_URL}${post.cover_image_url})` }}></div>
        ) : (
          <div className="post-card-image" style={{ backgroundColor: '#e0e7ff' }}></div>
        )}
        <div className="post-card-content">
          <div className="post-author">
            <img src={getImageUrl(post.avatar_url) || `https://ui-avatars.com/api/?name=${post.username}&background=random`} alt={post.username} className="author-avatar" />
            <div>
              <span className="author-name">{post.username}</span>
              <span className="post-meta">{formatDistanceToNow(new Date(post.created_at))} ago &middot; {readingTime} min read</span>
            </div>
          </div>
          <h4 className="post-title">{post.title}</h4>
          <p className="post-snippet">{(post.content || '').substring(0, 150)}...</p>
          <div className="post-tags">
            {(post.tags || []).slice(0, 3).map(tag => (
              <Link
                key={tag}
                to={`/tag/${tag}`}
                className="tag"
                onClick={handleTagClick}
              >
                #{tag}
              </Link>
            ))}
          </div>
          <div className="post-actions">
            <div className={`action-item ${isLiked ? 'active' : ''}`} onClick={(e) => handleAction('like', e)}>
              <i className={`${isLiked ? 'fas fa-heart' : 'far fa-heart'} ${animating.like ? 'pop-animation' : ''}`}></i>
              <span>{likeCount}</span>
            </div>
            <div className={`action-item ${isSaved ? 'active' : ''}`} onClick={(e) => handleAction('save', e)}>
              <i className={`${isSaved ? 'fas fa-bookmark' : 'far fa-bookmark'} ${animating.save ? 'pop-animation' : ''}`}></i>
            </div>
          </div>
        </div>
      </div>
      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
    </>
  );
};

export default PostCard;
