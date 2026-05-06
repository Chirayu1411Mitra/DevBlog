import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useToast } from '../components/ToastContext';
import Loader from '../components/Loader';
import ConfirmModal from '../components/ConfirmModal';
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
  const [currentUser, setCurrentUser] = useState(null);
  
  // Modal state
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState(null);
  
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

  useEffect(() => {
    const fetchMe = async () => {
      if (token) {
        try {
          const res = await axios.get(`${API_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setCurrentUser(res.data.user);
        } catch (e) {
          console.error('Failed to fetch current user:', e);
        }
      }
    };
    fetchMe();
  }, [token]);

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

  const initiateDeleteComment = (commentId) => {
    setCommentToDelete(commentId);
    setIsConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!commentToDelete) return;
    try {
      await axios.delete(`${API_URL}/posts/${id}/comments/${commentToDelete}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setComments(comments.filter(c => c.id !== commentToDelete));
      addToast('Comment deleted', { type: 'success' });
    } catch (error) {
      console.error('Failed to delete comment:', error);
      addToast('Failed to delete comment', { type: 'error' });
    } finally {
      setCommentToDelete(null);
    }
  };

  if (loading) return <Loader />;
  if (!post) return (
    <div className="main-container text-center" style={{ marginTop: '5rem' }}>
      <h2>Post not found.</h2>
      <Link to="/" className="btn btn-primary" style={{ marginTop: '1rem' }}>Back to Home</Link>
    </div>
  );

  const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:6969/api').replace('/api', '');

  return (
    <div className="reading-container" style={{ paddingBottom: '5rem' }}>
      <article className="post-article">
        <header className="reading-header" style={{ marginBottom: '3rem', paddingTop: '2rem' }}>
          <h1 style={{ fontSize: 'clamp(2.25rem, 6vw, 3.75rem)', marginBottom: '1.5rem', lineHeight: '1.15', fontWeight: 800, color: 'var(--text)' }}>
            {post.title}
          </h1>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
            <img
              src={post.avatar_url ? (post.avatar_url.startsWith('/uploads') ? `${API_BASE_URL}${post.avatar_url}` : post.avatar_url) : `https://ui-avatars.com/api/?name=${post.username}&background=random`}
              alt={post.username}
              style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border)' }}
            />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                <Link to={`/user/${post.username}`} style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text)' }}>
                  {post.username}
                </Link>
                <span style={{ color: 'var(--text-dim)' }}>&middot;</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '.9rem' }}>
                  {formatDistanceToNow(new Date(post.created_at))} ago
                </span>
              </div>
              <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem', marginTop: '2px' }}>
                {Math.ceil((post.content || '').split(' ').length / 200) || 1} min read
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            {(post.tags || []).map((tag, i) => (
              <Link key={i} to={`/tag/${encodeURIComponent(tag)}`} className="tag-pill">
                #{tag}
              </Link>
            ))}
          </div>
        </header>

        {post.cover_image_url && (
          <img
            src={post.cover_image_url.startsWith('/uploads') ? `${API_BASE_URL}${post.cover_image_url}` : post.cover_image_url}
            alt={post.title}
            className="reading-cover"
            style={{ marginBottom: '3rem' }}
          />
        )}

        <div className="reading-content">
          <ReactMarkdown
            components={{
              code({ inline, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                return !inline && match ? (
                  <SyntaxHighlighter
                    style={oneDark}
                    language={match[1]}
                    PreTag="div"
                    {...props}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                ) : (
                  <code className={className} style={{ background: 'var(--elevated)', padding: '2px 6px', borderRadius: '4px' }} {...props}>
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

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2rem 0', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)', marginBottom: '4rem', marginTop: '4rem' }}>
          <div style={{ display: 'flex', gap: '2rem' }}>
            <button className="action-item" onClick={handleLike} style={{ background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: isLiked ? 'var(--accent)' : 'var(--text-muted)' }}>
              <i className={isLiked ? 'fas fa-heart' : 'far fa-heart'}></i>
              <span style={{ fontSize: '1rem', fontWeight: 600 }}>{likeCount}</span>
            </button>
            <button className="action-item" onClick={handleSave} style={{ background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: isSaved ? 'var(--accent)' : 'var(--text-muted)' }}>
              <i className={isSaved ? 'fas fa-bookmark' : 'far fa-bookmark'}></i>
              <span style={{ fontSize: '1rem', fontWeight: 600 }}>{isSaved ? 'Saved' : 'Save'}</span>
            </button>
          </div>
          {post.is_author && (
            <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/post/${post.id}/edit`)}>
              <i className="fas fa-edit"></i> Edit
            </button>
          )}
        </div>
      </article>

      <AuthorCard post={post} token={token} addToast={addToast} navigate={navigate} />

      <section className="comments-section" style={{ marginTop: '5rem' }}>
        <h3 style={{ marginBottom: '2rem', fontSize: '1.5rem', fontWeight: 700 }}>Discussion ({comments.length})</h3>
        
        <div className="card" style={{ padding: '1.5rem', marginBottom: '3rem' }}>
          {token ? (
            <form onSubmit={handleAddComment}>
              <textarea
                className="form-control"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Share your thoughts..."
                rows={3}
                style={{ marginBottom: '1rem', background: 'var(--bg)', borderRadius: 'var(--radius-sm)' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btn-primary" disabled={!newComment.trim()}>Post Comment</button>
              </div>
            </form>
          ) : (
            <div className="text-center" style={{ padding: '1rem 0' }}>
              <p style={{ color: 'var(--text-muted)' }}>
                Please <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>sign in</Link> to join the discussion.
              </p>
            </div>
          )}
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {comments.length === 0 ? (
            <p className="text-center" style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>No comments yet. Be the first to share your thoughts!</p>
          ) : (
            comments.map(comment => (
              <div key={comment.id} style={{ display: 'flex', gap: '1rem' }}>
                <img
                  src={comment.avatar_url ? (comment.avatar_url.startsWith('/uploads') ? `${API_BASE_URL}${comment.avatar_url}` : comment.avatar_url) : `https://ui-avatars.com/api/?name=${comment.username}&background=random`}
                  alt={comment.username}
                  style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-subtle)' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Link to={`/user/${comment.username}`} style={{ fontWeight: '700', fontSize: '.95rem', color: 'var(--text)' }}>{comment.username}</Link>
                      <span style={{ color: 'var(--text-dim)', fontSize: '.8rem' }}>&middot; {formatDistanceToNow(new Date(comment.created_at))} ago</span>
                    </div>
                    {token && currentUser && (comment.user_id === currentUser.id || post.is_author) && (
                      <button 
                        onClick={() => initiateDeleteComment(comment.id)} 
                        style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.8rem', opacity: 0.6 }}
                        title="Delete comment"
                      >
                        <i className="fas fa-trash-alt"></i>
                      </button>
                    )}
                  </div>
                  <p style={{ lineHeight: '1.6', color: 'var(--text-muted)', fontSize: '.95rem' }}>{comment.content}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Comment"
        message="Are you sure you want to delete this comment? This action cannot be undone."
        confirmText="Delete"
        type="danger"
      />
    </div>
  );
};

const AuthorCard = ({ post, token, addToast, navigate }) => {
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:6969/api').replace('/api', '');

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
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '2rem', padding: '2.5rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
      <img
        src={post.avatar_url ? (post.avatar_url.startsWith('/uploads') ? `${API_BASE_URL}${post.avatar_url}` : post.avatar_url) : `https://ui-avatars.com/api/?name=${post.username}&background=random&size=100`}
        alt={post.username}
        style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: '4px solid var(--bg)' }}
      />
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
          <div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.25rem', color: 'var(--text)' }}>
              {post.username}
            </h3>
            {post.headline ? (
              <p style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.5rem' }}>
                {post.headline}
              </p>
            ) : null}
          </div>
          {token && !post.is_author && (
            <button
              className={`btn ${isFollowing ? 'btn-secondary' : 'btn-primary'}`}
              onClick={handleFollow}
              disabled={loading}
              style={{ borderRadius: '99px', padding: '0.5rem 1.5rem' }}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </button>
          )}
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '1rem', lineHeight: '1.6', maxWidth: '500px' }}>
          {post.bio || `Exploring the intersection of technology and creativity. Read more stories from ${post.username} on DevBlog.`}
        </p>
      </div>
    </div>
  );
};

export default PostPage;