import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { format } from 'date-fns';
import { Eye, Heart, Bookmark } from 'lucide-react';
import { Avi, TagBadge } from './DesignSystem';
import { cn, fmt } from '../utils';
import LoginModal from './LoginModal';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:6969/api';
const API_BASE_URL = API_URL.replace('/api', '');

const PostCard = ({ post, token, featured }) => {
  const navigate = useNavigate();
  const [isLiked, setIsLiked] = useState(post.user_has_liked);
  const [likeCount, setLikeCount] = useState(parseInt(post.like_count, 10) || 0);
  const [isSaved, setIsSaved] = useState(post.user_has_saved);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const readingTime = Math.ceil((post.content || '').split(' ').length / 200) || 1;

  const handleAction = async (action, e) => {
    e.stopPropagation();
    if (!token) { setShowLoginModal(true); return; }
    try {
      const response = await axios.post(`${API_URL}/posts/${post.id}/${action}`, {}, {
        withCredentials: true // ensuring cookie is sent if we use cookies
      });
      if (action === 'like') {
        setIsLiked(response.data.liked);
        setLikeCount(prev => response.data.liked ? prev + 1 : prev - 1);
      } else if (action === 'save') {
        setIsSaved(response.data.saved);
      }
    } catch (error) {
      console.error(`Failed to ${action} post:`, error);
    }
  };

  const formattedDate = post.created_at ? format(new Date(post.created_at), 'MMM d, yyyy') : 'Unknown';

  const avatarUrl = post.avatar_url && post.avatar_url.startsWith('/uploads')
    ? `${API_BASE_URL}${post.avatar_url}`
    : post.avatar_url;

  return (
    <>
      <article
        onClick={() => navigate(`/post/${post.id}${post.slug ? `-${post.slug}` : ''}`)}
        className={cn(
          "group bg-card border border-border rounded-lg p-5 cursor-pointer hover:border-primary/30 hover:shadow-sm transition-all flex flex-col h-full",
          featured && "sm:col-span-2 lg:col-span-3"
        )}
      >
        <div className="flex flex-wrap gap-1.5 mb-3">
          {(post.tags || []).map((t) => (
            <TagBadge key={t} label={t} onClick={(e) => { e.stopPropagation(); navigate(`/tag/${encodeURIComponent(t)}`); }} />
          ))}
        </div>

        {post.cover_image_url && featured && (
          <div className="w-full h-48 mb-4 rounded-md overflow-hidden bg-muted">
            <img 
              src={post.cover_image_url.startsWith('/uploads') ? `${API_BASE_URL}${post.cover_image_url}` : post.cover_image_url} 
              alt={post.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </div>
        )}

        <h2 className={cn(
          "font-semibold text-foreground group-hover:text-primary transition-colors leading-snug mb-2",
          featured ? "text-xl sm:text-2xl" : "text-base sm:text-lg"
        )} style={{ fontFamily: "var(--font-display)" }}>
          {post.title}
        </h2>

        <p className={cn("text-muted-foreground leading-relaxed mb-4 flex-grow", featured ? "text-sm sm:text-base" : "text-sm line-clamp-2")}>
          {(post.content || '').replace(/[#*`>\[\]]/g, '').substring(0, 160)}...
        </p>

        <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/50">
          <div className="flex items-center gap-2">
            {avatarUrl ? (
              <img src={avatarUrl} alt={post.username} className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <Avi initials={(post.username || '?').charAt(0).toUpperCase()} size="xs" />
            )}
            <div className="flex flex-col leading-tight">
              <span className="text-xs font-medium text-foreground">{post.username}</span>
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                <span>{formattedDate}</span>
                <span>·</span>
                <span>{readingTime}m read</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
            <span className="flex items-center gap-1"><Eye size={11} />{fmt(post.view_count || 0)}</span>
            <button onClick={(e) => handleAction('like', e)} className={cn("flex items-center gap-1 transition-colors z-10 relative", isLiked && "text-rose-500")}>
              <Heart size={11} fill={isLiked ? "currentColor" : "none"} />{fmt(likeCount)}
            </button>
            <button onClick={(e) => handleAction('save', e)} className={cn("flex items-center gap-1 transition-colors z-10 relative", isSaved && "text-primary")}>
              <Bookmark size={11} fill={isSaved ? "currentColor" : "none"} />
            </button>
          </div>
        </div>
      </article>

      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
    </>
  );
};

export default PostCard;
