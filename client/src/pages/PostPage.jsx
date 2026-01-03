import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { coy } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useToast } from '../components/ToastContext';
import Loader from '../components/Loader';
import { formatDistanceToNow } from 'date-fns';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:6969/api';

const PostPage = () => {
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const { id } = useParams();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const token = sessionStorage.getItem('token');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const [postResponse, commentsResponse] = await Promise.all([
          axios.get(`${API_URL}/posts/${id}`, { headers }),
          axios.get(`${API_URL}/posts/${id}/comments`)
        ]);
        setPost(postResponse.data);
        setIsLiked(postResponse.data.user_has_liked);
        setLikeCount(parseInt(postResponse.data.like_count, 10) || 0);
        setIsSaved(postResponse.data.user_has_saved);
        setComments(commentsResponse.data);
      } catch (error) {
        console.error('Failed to fetch post:', error);
        addToast('Failed to load post.', { type: 'error' });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, token, addToast]);

  const handleLike = async () => {
    if (!token) {
      addToast('Please log in to like posts', { type: 'info' });
      navigate('/login');
      return;
    }
    try {
      const response = await axios.post(`${API_URL}/posts/${id}/like`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsLiked(response.data.liked);
      setLikeCount(prev => response.data.liked ? prev + 1 : prev - 1);
      addToast(response.data.message, { type: 'success' });
    } catch (error) {
      console.error('Failed to like/unlike post:', error);
      addToast(error.response?.data?.message || 'Action failed', { type: 'error' });
    }
  };

  const handleSave = async () => {
    if (!token) {
      addToast('Please log in to save posts', { type: 'info' });
      navigate('/login');
      return;
    }
    try {
      const response = await axios.post(`${API_URL}/posts/${id}/save`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsSaved(response.data.saved);
      addToast(response.data.message, { type: 'success' });
    } catch (error) {
      console.error('Failed to save/unsave post:', error);
      addToast(error.response?.data?.message || 'Action failed', { type: 'error' });
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!token) {
      addToast('Please log in to comment', { type: 'info' });
      navigate('/login');
      return;
    }
    if (!newComment.trim()) return;

    try {
      const response = await axios.post(`${API_URL}/posts/${id}/comments`,
        { content: newComment },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setComments([response.data, ...comments]);
      setNewComment('');
      addToast('Comment added!', { type: 'success' });
    } catch (error) {
      console.error('Failed to add comment:', error);
      addToast('Failed to add comment', { type: 'error' });
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await axios.delete(`${API_URL}/posts/${id}/comments/${commentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setComments(comments.filter(c => c.id !== commentId));
      addToast('Comment deleted', { type: 'success' });
    } catch (error) {
      console.error('Failed to delete comment:', error);
      addToast('Failed to delete comment', { type: 'error' });
    }
  };

  if (loading) return <Loader />;
  if (!post) return <p>Post not found.</p>;

  const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:6969/api').replace('/api', '');

  return (
    <div className="post-page-layout">
      <main className="post-content-column">
        {post.cover_image_url && (
          <img
            src={`${API_BASE_URL}${post.cover_image_url}`}
            alt={post.title}
            className="post-cover-image"
          />
        )}
        <h1 className="post-title">{post.title}</h1>

        <div className="post-tags-section">
          {(post.tags || []).map((tag, i) => (
            <Link key={i} to={`/tag/${encodeURIComponent(tag)}`} className="tag-pill">
              #{tag}
            </Link>
          ))}
        </div>

        <div className="post-markdown-content">
          <ReactMarkdown
            components={{
              code({ inline, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                return !inline && match ? (
                  <SyntaxHighlighter
                    style={coy}
                    language={match[1]}
                    PreTag="div"
                    {...props}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                ) : (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              },
            }}
            rehypePlugins={[rehypeSanitize]}
          >
            {post.content}
          </ReactMarkdown>
        </div>

        <div className="post-engagement">
          <button className={`engagement-btn ${isLiked ? 'active' : ''}`} onClick={handleLike}>
            <i className={isLiked ? 'fas fa-heart' : 'far fa-heart'}></i>
            <span>{likeCount} likes</span>
          </button>
          <button className={`engagement-btn ${isSaved ? 'active' : ''}`} onClick={handleSave}>
            <i className={isSaved ? 'fas fa-bookmark' : 'far fa-bookmark'}></i>
            <span>{isSaved ? 'Saved' : 'Save'}</span>
          </button>
        </div>

        <div className="comments-section">
          <h3>Comments ({comments.length})</h3>
          {token && (
            <form onSubmit={handleAddComment} className="comment-form">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Share your thoughts..."
                rows={3}
              />
              <button type="submit" className="btn btn-dark">Post Comment</button>
            </form>
          )}
          <div className="comments-list">
            {comments.map(comment => (
              <div key={comment.id} className="comment-item">
                <img
                  src={comment.avatar_url || `https://ui-avatars.com/api/?name=${comment.username}&background=random`}
                  alt={comment.username}
                  className="comment-avatar"
                />
                <div className="comment-content">
                  <div className="comment-header">
                    <span className="comment-author">{comment.username}</span>
                    <span className="comment-date">{formatDistanceToNow(new Date(comment.created_at))} ago</span>
                  </div>
                  <p className="comment-text">{comment.content}</p>
                  {token && comment.user_id === post.user_id && (
                    <button onClick={() => handleDeleteComment(comment.id)} className="btn-delete-comment">
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <aside className="post-sidebar-column">
        <AuthorCard post={post} token={token} addToast={addToast} navigate={navigate} />
      </aside>
    </div>
  );
};

const AuthorCard = ({ post, token, addToast, navigate }) => {
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchFollowStatus = async () => {
      if (!token) return;
      try {
        const response = await axios.get(`${API_URL}/users/${post.username}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setIsFollowing(response.data.user.is_following);
      } catch (err) {
        console.error('Failed to fetch follow status:', err);
      }
    };
    fetchFollowStatus();
  }, [post.username, token]);

  const handleFollow = async () => {
    if (!token) {
      addToast('Please log in to follow users', { type: 'info' });
      navigate('/login');
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/users/${post.user_id}/follow`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsFollowing(response.data.following);
      addToast(response.data.message, { type: 'success' });
    } catch (error) {
      addToast(error.response?.data?.message || 'Action failed', { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="author-card">
      <img
        src={post.avatar_url || `https://ui-avatars.com/api/?name=${post.username}&background=random&size=80`}
        alt={post.username}
        className="author-card-avatar"
      />
      <h4 className="author-card-name">{post.username}</h4>
      <p className="author-card-bio">Full-stack developer passionate about React and TypeScript. Building amazing web experiences.</p>
      {token && !post.is_author && (
        <button
          className={`btn ${isFollowing ? 'btn-secondary' : 'btn-dark'}`}
          onClick={handleFollow}
          disabled={loading}
        >
          {isFollowing ? 'Following' : 'Follow'}
        </button>
      )}
      {post.is_author && (
        <div className="author-post-actions">
          <button className="btn btn-secondary" onClick={() => navigate(`/post/${post.id}/edit`)}>
            <i className="fas fa-edit"></i> Edit Post
          </button>
        </div>
      )}
    </div>
  );
};

export default PostPage;