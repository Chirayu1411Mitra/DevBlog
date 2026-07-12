import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import PostCard from '../components/PostCard';
import LoginModal from '../components/LoginModal';
import Loader from '../components/Loader';
import { Search, TrendingUp, Star, Hash, ChevronDown } from 'lucide-react';
import { TagBadge, Avi, Btn, Divider } from '../components/DesignSystem';
import { cn, fmt } from '../utils';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:6969/api';

const HomePage = () => {
  const [posts, setPosts] = useState([]);
  const [trendingPosts, setTrendingPosts] = useState([]);
  const [popularTags, setPopularTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeTag, setActiveTag] = useState("all");
  const [showAllTags, setShowAllTags] = useState(false);
  const navigate = useNavigate();
  const token = document.cookie.includes('isLoggedIn=true');

  useEffect(() => {
    const fetchSidebarData = async () => {
      try {
        const [topRes, tagsRes] = await Promise.all([
          axios.get(`${API_URL}/posts/top`),
          axios.get(`${API_URL}/posts/tags/popular`)
        ]);
        setTrendingPosts(topRes.data);
        setPopularTags(tagsRes.data.map(t => t.tag));
      } catch (err) {
        console.error("Failed to fetch sidebar data", err);
      }
    };
    fetchSidebarData();
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      setLoading(true);
      try {
        let url = `${API_URL}/posts?page=${currentPage}&limit=20`;

        if (searchTerm.trim()) {
          url = `${API_URL}/posts/search?q=${encodeURIComponent(searchTerm.trim())}`;
        }

        const response = await axios.get(url);
        if (searchTerm.trim()) {
            setPosts(response.data);
            setTotalPages(1);
        } else {
            setPosts(response.data.posts);
            setTotalPages(response.data.totalPages);
        }
        setError(null);
      } catch (err) {
        console.error('Search error:', err);
        setError('Failed to fetch posts.');
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, token, currentPage]);

  useEffect(() => {
      setCurrentPage(1);
  }, [searchTerm]);

  const filteredPosts = activeTag === "all" 
    ? posts 
    : posts.filter(p => (p.tags || []).includes(activeTag));

  const featured = filteredPosts.length > 0 ? filteredPosts[0] : null;
  const rest = filteredPosts.length > 1 ? filteredPosts.slice(1) : [];
  
  const ALL_TAGS = ["all", ...popularTags];
  const visibleTags = showAllTags ? ALL_TAGS : ALL_TAGS.slice(0, 6);

  const heroLoggedOut = (
    <section className="bg-primary text-primary-foreground rounded-2xl p-8 sm:p-12 mb-10 text-center sm:text-left relative overflow-hidden">
      <div className="relative z-10 max-w-2xl">
        <h2 className="text-3xl sm:text-5xl font-bold mb-4" style={{ fontFamily: "var(--font-display)" }}>Where developers write & learn</h2>
        <p className="text-primary-foreground/80 text-lg mb-8 leading-relaxed">
          Discover insightful articles, tutorials, and stories from developers around the world. Join our community to start sharing your knowledge.
        </p>
        <div className="flex items-center gap-4 justify-center sm:justify-start">
          <button className="bg-background text-foreground px-6 py-2.5 rounded font-medium hover:opacity-90 transition-opacity" onClick={() => navigate('/register')}>Get Started Free</button>
          <button className="bg-primary-foreground/10 text-primary-foreground px-6 py-2.5 rounded font-medium hover:bg-primary-foreground/20 transition-colors border border-primary-foreground/20" onClick={() => navigate('/login')}>Sign In</button>
        </div>
      </div>
      <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-primary-foreground/5 rounded-full blur-3xl pointer-events-none"></div>
    </section>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {!token && heroLoggedOut}

      <div className="grid lg:grid-cols-[1fr_260px] gap-8 lg:gap-12">
        {/* Main column */}
        <div>
          {/* Search */}
          <div className="relative mb-6">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search for articles, tutorials, or ideas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-input-background text-foreground placeholder:text-muted-foreground rounded-lg pl-11 pr-4 py-2.5 text-sm border border-transparent focus:outline-none focus:ring-1 focus:ring-ring transition-all"
            />
          </div>

          {/* Tag filter */}
          <div className="flex items-center gap-2 mb-6 flex-wrap">
            {visibleTags.map((t) => (
              <TagBadge key={t} label={t === "all" ? "All" : t} active={activeTag === t} onClick={() => setActiveTag(t)} mono={t !== "all"} />
            ))}
            {!showAllTags && ALL_TAGS.length > 6 && (
              <button
                onClick={() => setShowAllTags(true)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 ml-2"
              >
                +{ALL_TAGS.length - 6} more <ChevronDown size={11} />
              </button>
            )}
          </div>

          {error && <p className="text-destructive text-center mb-6">{error}</p>}

          {/* Posts */}
          {loading && posts.length === 0 ? (
            <div className="flex justify-center py-12"><Loader /></div>
          ) : (
            <>
              {featured && !searchTerm && (
                <div className="mb-6">
                  <PostCard post={featured} token={token} featured />
                </div>
              )}
              
              <div className="grid sm:grid-cols-2 gap-4">
                {(searchTerm ? filteredPosts : rest).map((a) => (
                  <PostCard key={a.id} post={a} token={token} />
                ))}
              </div>

              {filteredPosts.length === 0 && (
                <div className="py-20 text-center bg-card border border-border rounded-lg mt-4">
                  <Hash size={32} className="text-muted-foreground mx-auto mb-3 opacity-30" />
                  <p className="text-muted-foreground">No articles found.</p>
                </div>
              )}
            </>
          )}

          {!loading && !searchTerm.trim() && totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 py-12">
                <Btn variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Previous</Btn>
                <span className="text-sm text-muted-foreground font-mono">Page {currentPage} of {totalPages}</span>
                <Btn variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>Next</Btn>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="hidden lg:flex flex-col gap-8">
          {/* Trending */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={14} className="text-primary" />
              <h3 className="text-sm font-semibold text-foreground" style={{ fontFamily: "var(--font-display)" }}>Trending</h3>
            </div>
            <div className="space-y-4">
              {trendingPosts.length > 0 ? trendingPosts.map((post, i) => (
                <Link key={post.id} to={`/post/${post.id}${post.slug ? `-${post.slug}` : ''}`} className="flex gap-3 items-start group">
                  <span className="text-2xl font-bold text-muted-foreground/30 leading-none mt-0.5 w-5 flex-shrink-0" style={{ fontFamily: "var(--font-display)" }}>
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm text-foreground font-medium leading-snug group-hover:text-primary transition-colors line-clamp-2">
                      {post.title}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono mt-1">{post.like_count || 0} likes</p>
                  </div>
                </Link>
              )) : (
                <p className="text-sm text-muted-foreground">No trending posts yet.</p>
              )}
            </div>
          </div>

          <Divider />

          {/* Tags cloud */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Hash size={14} className="text-primary" />
              <h3 className="text-sm font-semibold text-foreground" style={{ fontFamily: "var(--font-display)" }}>Popular Tags</h3>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {popularTags.map((t) => (
                <TagBadge key={t} label={t} onClick={() => { setActiveTag(t); setSearchTerm(''); }} active={activeTag === t} />
              ))}
              {popularTags.length === 0 && (
                <p className="text-sm text-muted-foreground">No tags found.</p>
              )}
            </div>
          </div>
        </aside>
      </div>

      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
    </div>
  );
};

export default HomePage;