import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import Loader from '../components/Loader';
import ConfirmModal from '../components/ConfirmModal';
import { formatDistanceToNow, format } from 'date-fns';
import { ArrowLeft, Clock, Eye, Heart, Bookmark, Share2, ExternalLink, MessageSquare, CheckCircle, Copy } from 'lucide-react';
import { cn, fmt } from '../utils';
import { Avi, TagBadge, Btn, CodeBlock } from '../components/DesignSystem';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:6969/api';
const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:6969/api').replace('/api', '');

const AuthorCard = ({ post, token, navigate, sidebar = false }) => {
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchFollowStatus = async () => {
      if (!token || !post?.username) return;
      try {
        const response = await axios.get(`${API_URL}/users/${post.username}`);
        setIsFollowing(response.data.user.is_following);
      } catch (err) {
        console.error('Failed to fetch follow status:', err);
      }
    };
    fetchFollowStatus();
  }, [post?.username, token]);

  const handleFollow = async () => {
    if (!token) {
      navigate('/login');
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/users/${post.user_id}/follow`);
      setIsFollowing(response.data.following);
    } catch (error) {
      console.error('Action failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const avatarUrl = post?.avatar_url && post.avatar_url.startsWith('/uploads') ? `${API_BASE_URL}${post.avatar_url}` : post?.avatar_url;

  return (
    <div className={cn(
      "p-5 bg-card border border-border rounded-lg",
      sidebar ? "flex flex-col items-center text-center mb-6" : "mt-10 flex gap-4"
    )}>
      {avatarUrl ? (
        <img src={avatarUrl} alt={post.username} className={cn("rounded-full object-cover border border-border", sidebar ? "w-20 h-20 mb-3" : "w-14 h-14")} />
      ) : (
        <div className={sidebar ? "mb-3" : ""}>
          <Avi initials={(post?.username || '?').charAt(0).toUpperCase()} size={sidebar ? "xl" : "lg"} />
        </div>
      )}
      <div className="flex-1 min-w-0 w-full">
        <div className={cn("flex gap-2", sidebar ? "flex-col items-center" : "items-start justify-between")}>
          <Link to={`/user/${post?.username}`}>
            <div className="font-semibold text-foreground hover:text-primary transition-colors" style={{ fontFamily: "var(--font-display)" }}>{post?.username}</div>
            {post?.headline ? (
              <div className="text-xs text-muted-foreground mt-0.5">{post.headline}</div>
            ) : (
              <div className="text-xs font-mono text-muted-foreground">@{post?.username}</div>
            )}
          </Link>
          {token && !post?.is_author && (
            <Btn variant={isFollowing ? "secondary" : "outline"} size="sm" onClick={handleFollow} loading={loading} className={sidebar ? "w-full mt-2" : ""}>
              {isFollowing ? 'Following' : 'Follow'}
            </Btn>
          )}
        </div>
        <p className={cn("text-sm text-muted-foreground leading-relaxed", sidebar ? "mt-3" : "mt-2")}>
          {post?.bio || `Read more stories from ${post?.username} on DevBlog.`}
        </p>
      </div>
    </div>
  );
};

const PostPage = () => {
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [commenting, setCommenting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState(null);

  const [headings, setHeadings] = useState([]);
  const [activeSection, setActiveSection] = useState("");

  const { idSlug } = useParams();
  const id = idSlug ? idSlug.split('-')[0] : null;
  const navigate = useNavigate();
  const token = document.cookie.includes('isLoggedIn=true');

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        const [postResponse, commentsResponse] = await Promise.all([
          axios.get(`${API_URL}/posts/${id}`),
          axios.get(`${API_URL}/posts/${id}/comments`)
        ]);

        const postData = postResponse.data;
        const expectedSlug = postData.slug ? `-${postData.slug}` : '';
        const canonicalIdSlug = `${postData.id}${expectedSlug}`;
        
        if (idSlug !== canonicalIdSlug) {
            navigate(`/post/${canonicalIdSlug}`, { replace: true });
        }

        setPost(postData);
        setIsLiked(postData.user_has_liked);
        setLikeCount(parseInt(postData.like_count, 10) || 0);
        setIsSaved(postData.user_has_saved);
        setComments(commentsResponse.data);
      } catch (error) {
        console.error('Failed to fetch post:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, token]);

  const registerHeading = (level, text, headingId) => {
    setHeadings(prev => {
      if (prev.some(h => h.id === headingId)) return prev;
      return [...prev, { level, text, id: headingId }];
    });
  };

  const generateHeadingId = (text) => {
    return text.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
  };

  useEffect(() => {
    const fetchMe = async () => {
      if (token) {
        try {
          const res = await axios.get(`${API_URL}/auth/me`);
          setCurrentUser(res.data.user);
        } catch (e) {
          console.error('Failed to fetch current user:', e);
        }
      }
    };
    fetchMe();
  }, [token]);

  const handleLike = async () => {
    if (!token) { navigate('/login'); return; }
    try {
      const response = await axios.post(`${API_URL}/posts/${id}/like`);
      setIsLiked(response.data.liked);
      setLikeCount(prev => response.data.liked ? prev + 1 : prev - 1);
    } catch (error) {
      console.error('Failed to like post:', error);
    }
  };

  const handleSave = async () => {
    if (!token) { navigate('/login'); return; }
    try {
      const response = await axios.post(`${API_URL}/posts/${id}/save`);
      setIsSaved(response.data.saved);
    } catch (error) {
      console.error('Failed to save post:', error);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!token) { navigate('/login'); return; }
    if (!newComment.trim()) return;

    setCommenting(true);
    try {
      const response = await axios.post(`${API_URL}/posts/${id}/comments`, { content: newComment });
      setComments([response.data, ...comments]);
      setNewComment('');
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setCommenting(false);
    }
  };

  const initiateDeleteComment = (commentId) => {
    setCommentToDelete(commentId);
    setIsConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!commentToDelete) return;
    try {
      await axios.delete(`${API_URL}/posts/${id}/comments/${commentToDelete}`);
      setComments(comments.filter(c => c.id !== commentToDelete));
    } catch (error) {
      console.error('Failed to delete comment:', error);
    } finally {
      setCommentToDelete(null);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader /></div>;
  if (!post) return (
    <div className="max-w-6xl mx-auto px-4 py-20 text-center">
      <h2 className="text-2xl font-bold text-foreground mb-4">Post not found.</h2>
      <Btn variant="primary" onClick={() => navigate('/')}>Back to Home</Btn>
    </div>
  );

  const readingTime = Math.ceil((post.content || '').split(' ').length / 200) || 1;
  const formattedDate = post.created_at ? format(new Date(post.created_at), 'MMM d, yyyy') : 'Unknown';
  const avatarUrl = post.avatar_url && post.avatar_url.startsWith('/uploads') ? `${API_BASE_URL}${post.avatar_url}` : post.avatar_url;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <button
        onClick={() => navigate("/")}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
      >
        <ArrowLeft size={14} /> Back to feed
      </button>

      <div className="grid lg:grid-cols-[1fr_220px] gap-12">
        <article className="min-w-0">
          <div className="flex gap-2 flex-wrap mb-4">
            {(post.tags || []).map((t) => <TagBadge key={t} label={t} onClick={() => navigate(`/tag/${encodeURIComponent(t)}`)} />)}
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-foreground leading-tight mb-5" style={{ fontFamily: "var(--font-display)" }}>
            {post.title}
          </h1>

          <div className="flex items-center justify-between flex-wrap gap-4 pb-6 border-b border-border mb-8">
            <div className="flex items-center gap-3">
              {avatarUrl ? (
                <img src={avatarUrl} alt={post.username} className="w-10 h-10 rounded-full object-cover border border-border" />
              ) : (
                <Avi initials={(post.username || '?').charAt(0).toUpperCase()} size="md" />
              )}
              <div>
                <Link to={`/user/${post.username}`} className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                  {post.username}
                </Link>
                <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono mt-0.5">
                  <span>{formattedDate}</span>
                  <span>·</span>
                  <span className="flex items-center gap-1"><Clock size={11} />{readingTime} min read</span>
                  <span>·</span>
                  <span className="flex items-center gap-1"><Eye size={11} />{fmt(post.view_count || 0)} views</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={handleLike}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors",
                  isLiked ? "bg-rose-500/10 text-rose-500" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                <Heart size={14} fill={isLiked ? "currentColor" : "none"} />
                {fmt(likeCount)}
              </button>
              <button
                onClick={handleSave}
                className={cn(
                  "p-2 rounded transition-colors",
                  isSaved ? "text-primary bg-accent" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                <Bookmark size={14} fill={isSaved ? "currentColor" : "none"} />
              </button>
              <button className="p-2 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                <Share2 size={14} />
              </button>
              {post.is_author && (
                <button onClick={() => navigate(`/post/${post.id}/edit`)} className="p-2 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" title="Edit post">
                  <i className="fas fa-edit"></i>
                </button>
              )}
            </div>
          </div>

          {post.cover_image_url && (
            <div className="mb-10 rounded-xl overflow-hidden border border-border bg-muted">
              <img
                src={post.cover_image_url.startsWith('/uploads') ? `${API_BASE_URL}${post.cover_image_url}` : post.cover_image_url}
                alt={post.title}
                className="w-full h-auto object-cover max-h-[500px]"
              />
            </div>
          )}

          <div className="prose-sm leading-7 text-foreground space-y-5 text-[15px]">
            <ReactMarkdown
              components={{
                code({ inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  return !inline && match ? (
                    <div className="relative my-6">
                      <SyntaxHighlighter
                        style={oneDark}
                        language={match[1]}
                        PreTag="div"
                        className="rounded-lg !bg-[#0D0D12] dark:!bg-[#07070A] !text-[#C8C8D8] !text-[13px] !p-4 !m-0 !border !border-border"
                        {...props}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    </div>
                  ) : (
                    <code className="font-mono text-[13px] bg-secondary px-1.5 py-0.5 rounded text-primary" {...props}>
                      {children}
                    </code>
                  );
                },
                h1({ children, ...props }) {
                  const txt = String(children);
                  const id = generateHeadingId(txt);
                  registerHeading(1, txt, id);
                  return <h1 id={id} className="text-3xl font-bold text-foreground mt-8 mb-4" style={{ fontFamily: "var(--font-display)" }} {...props}>{children}</h1>;
                },
                h2({ children, ...props }) {
                  const txt = String(children);
                  const id = generateHeadingId(txt);
                  registerHeading(2, txt, id);
                  return <h2 id={id} className="text-2xl font-bold text-foreground mt-8 mb-4" style={{ fontFamily: "var(--font-display)" }} {...props}>{children}</h2>;
                },
                h3({ children, ...props }) {
                  const txt = String(children);
                  const id = generateHeadingId(txt);
                  registerHeading(3, txt, id);
                  return <h3 id={id} className="text-xl font-bold text-foreground mt-6 mb-3" style={{ fontFamily: "var(--font-display)" }} {...props}>{children}</h3>;
                }
              }}
              rehypePlugins={[rehypeSanitize]}
            >
              {post.content}
            </ReactMarkdown>
          </div>

          <div className="block lg:hidden">
            <AuthorCard post={post} token={token} navigate={navigate} />
          </div>

          {/* Comments Section */}
          <section className="mt-16 pt-10 border-t border-border">
            <h3 className="text-xl font-bold text-foreground mb-8" style={{ fontFamily: "var(--font-display)" }}>
              Discussion ({comments.length})
            </h3>

            {token ? (
              <form onSubmit={handleAddComment} className="mb-10 p-5 bg-card border border-border rounded-lg">
                <textarea
                  className="w-full bg-input-background text-foreground placeholder:text-muted-foreground rounded-md px-3 py-3 text-sm border border-transparent focus:outline-none focus:ring-1 focus:ring-ring transition-all resize-none mb-3"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Share your thoughts..."
                  rows={3}
                />
                <div className="flex justify-end">
                  <Btn type="submit" variant="primary" disabled={!newComment.trim()} loading={commenting}>Post Comment</Btn>
                </div>
              </form>
            ) : (
              <div className="mb-10 p-6 bg-card border border-border rounded-lg text-center">
                <p className="text-muted-foreground mb-4">Please sign in to join the discussion.</p>
                <Btn variant="primary" onClick={() => navigate('/login')}>Sign in</Btn>
              </div>
            )}

            <div className="space-y-6">
              {comments.length === 0 ? (
                <p className="text-center text-muted-foreground italic py-8">No comments yet. Be the first to share your thoughts!</p>
              ) : (
                comments.map(comment => {
                  const cAvatar = comment.avatar_url && comment.avatar_url.startsWith('/uploads') ? `${API_BASE_URL}${comment.avatar_url}` : comment.avatar_url;
                  return (
                    <div key={comment.id} className="flex gap-4">
                      {cAvatar ? (
                        <img src={cAvatar} alt={comment.username} className="w-10 h-10 rounded-full object-cover border border-border" />
                      ) : (
                        <Avi initials={(comment.username || '?').charAt(0).toUpperCase()} size="md" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link to={`/user/${comment.username}`} className="text-sm font-semibold text-foreground hover:text-primary transition-colors">{comment.username}</Link>
                            <span className="text-xs text-muted-foreground font-mono">&middot; {formatDistanceToNow(new Date(comment.created_at))} ago</span>
                          </div>
                          {token && currentUser && (comment.user_id === currentUser.id || post.is_author) && (
                            <button
                              onClick={() => initiateDeleteComment(comment.id)}
                              className="text-muted-foreground hover:text-destructive transition-colors"
                              title="Delete comment"
                            >
                              <i className="fas fa-trash-alt text-xs"></i>
                            </button>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{comment.content}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </article>

        <aside className="hidden lg:block">
          <div className="sticky top-20">
            <AuthorCard post={post} token={token} navigate={navigate} sidebar={true} />
            
            {headings.length > 0 && (
              <>
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-3">Contents</p>
                <nav className="space-y-0.5 max-h-[60vh] overflow-y-auto">
                  {headings.map((h) => (
                    <a
                      key={h.id}
                      href={`#${h.id}`}
                      className={cn(
                        "block w-full text-left rounded transition-colors border-l-2",
                        "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary",
                        h.level === 1 ? "py-1.5 px-3 text-sm font-medium" :
                        h.level === 2 ? "py-1 px-3 ml-2 text-[13px]" : "py-1 px-3 ml-4 text-[12px]"
                      )}
                    >
                      {h.text}
                    </a>
                  ))}
                </nav>
              </>
            )}

            <div className={cn("pt-6", headings.length > 0 ? "mt-6 border-t border-border" : "")}>
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-3">Share</p>
              <div className="flex flex-col gap-2">
                <button onClick={() => navigator.clipboard.writeText(window.location.href)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full text-left">
                  <ExternalLink size={13} /> Copy link
                </button>
              </div>
            </div>
          </div>
        </aside>
      </div>

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

export default PostPage;