import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Hash, Image as ImageIcon, Rss, Save } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import Loader from '../components/Loader';
import { Btn, TagBadge } from '../components/DesignSystem';
import { cn } from '../utils';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:6969/api';

export default function EditPostPage() {
  const { idSlug } = useParams();
  const id = idSlug ? idSlug.split('-')[0] : null;
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState([]);
  const [currentTag, setCurrentTag] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [isDraft, setIsDraft] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [feedbackMessage, setFeedbackMessage] = useState(null);
  const [feedbackType, setFeedbackType] = useState('info');
  const token = document.cookie.includes('isLoggedIn=true');
  const fileInputRef = useRef(null);

  const [preview, setPreview] = useState(false);
  const [savingAction, setSavingAction] = useState(null);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const res = await axios.get(`${API_URL}/posts/${id}`);
        setTitle(res.data.title);
        setContent(res.data.content);
        setTags(Array.isArray(res.data.tags) ? res.data.tags : []);
        setIsDraft(res.data.draft);
        setCoverImageUrl(res.data.cover_image_url || '');
      } catch (err) {
        console.error(err);
        setFeedbackMessage('Failed to load post for editing.');
        setFeedbackType('error');
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [id, token]);

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
      setLoading(true);
      const res = await axios.post(`${API_URL}/posts/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setCoverImageUrl(res.data.imageUrl);
      setFeedbackMessage('Image uploaded successfully!');
      setFeedbackType('success');
    } catch (error) {
      console.error('Image upload failed:', error);
      setFeedbackMessage('Image upload failed.');
      setFeedbackType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (publish) => {
    try {
      setSavingAction(publish ? 'publish' : 'draft');
      const payload = { title, content, tags, draft: !publish, cover_image_url: coverImageUrl };
      const res = await axios.put(`${API_URL}/posts/${id}`, payload);
      setFeedbackMessage(publish ? 'Post published!' : 'Changes saved!');
      setFeedbackType('success');
      navigate(`/post/${res.data.id}${res.data.slug ? `-${res.data.slug}` : ''}`);
    } catch (err) {
      console.error(err);
      setFeedbackMessage('Failed to save changes.');
      setFeedbackType('error');
    } finally {
      setSavingAction(null);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader /></div>;

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      {feedbackMessage && (
        <div className="fixed top-20 right-4 z-50">
          <div className={`p-4 rounded shadow-lg text-sm font-medium ${feedbackType === 'error' ? 'bg-destructive text-destructive-foreground' : 'bg-emerald-500 text-white'}`} onClick={() => setFeedbackMessage(null)}>
            {feedbackMessage}
          </div>
        </div>
      )}

      {/* Editor toolbar */}
      <div className="border-b border-border bg-card px-4 sm:px-6 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1" />
        <div className="flex items-center gap-1 bg-secondary rounded p-0.5">
          <button
            onClick={() => setPreview(false)}
            className={cn("px-3 py-1 text-sm rounded transition-colors", !preview ? "bg-card text-foreground shadow-sm font-medium" : "text-muted-foreground hover:text-foreground")}
          >
            Write
          </button>
          <button
            onClick={() => setPreview(true)}
            className={cn("px-3 py-1 text-sm rounded transition-colors", preview ? "bg-card text-foreground shadow-sm font-medium" : "text-muted-foreground hover:text-foreground")}
          >
            Preview
          </button>
        </div>
        <Btn variant="secondary" size="sm" onClick={() => handleSave(false)} loading={savingAction === 'draft'}>
          Save changes
        </Btn>
        <Btn variant="primary" size="sm" icon={isDraft ? <Rss size={14} /> : <Save size={14} />} onClick={() => handleSave(true)} loading={savingAction === 'publish'}>
          {isDraft ? 'Publish' : 'Save & Exit'}
        </Btn>
      </div>

      <div className="flex-1 overflow-hidden flex">
        {/* Write pane */}
        {!preview && (
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8">
              {/* Cover Image */}
              <div className="mb-6">
                <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                {!coverImageUrl ? (
                  <button onClick={() => fileInputRef.current.click()} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors border border-dashed border-border hover:border-primary/50 rounded-lg w-full p-6 justify-center">
                    <ImageIcon size={18} /> Add cover image
                  </button>
                ) : (
                  <div className="relative group rounded-lg overflow-hidden border border-border">
                    <img src={`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:6969'}${coverImageUrl}`} alt="Cover Preview" className="w-full h-auto max-h-64 object-cover" />
                    <button onClick={() => setCoverImageUrl('')} className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded hover:bg-destructive transition-colors">
                      &times;
                    </button>
                  </div>
                )}
              </div>

              {/* Title */}
              <textarea
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Article title…"
                rows={2}
                className="w-full text-3xl font-bold text-foreground bg-transparent placeholder:text-muted-foreground/40 resize-none focus:outline-none leading-tight mb-4"
                style={{ fontFamily: "var(--font-display)" }}
              />

              {/* Tags */}
              <div className="flex items-center gap-2 mb-6 pb-4 border-b border-border flex-wrap">
                <Hash size={14} className="text-muted-foreground flex-shrink-0" />
                <div className="flex flex-wrap gap-1.5">
                  {tags.map(tag => (
                    <TagBadge key={tag} label={tag} active onClick={() => handleRemoveTag(tag)} />
                  ))}
                </div>
                <input
                  value={currentTag}
                  onChange={(e) => setCurrentTag(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
                  placeholder="Add tags (press Enter)…"
                  className="flex-1 min-w-[200px] text-sm font-mono text-muted-foreground bg-transparent focus:outline-none placeholder:text-muted-foreground/50 focus:text-foreground transition-colors"
                />
              </div>

              {/* Markdown toolbar */}
              <div className="flex items-center gap-1 mb-4 flex-wrap">
                {[
                  ["B", "**bold**"], ["I", "_italic_"], ["H2", "## Heading"],
                  ["`code`", "`code`"], ["```", "```\n\n```"],
                ].map(([label, syntax]) => (
                  <button
                    key={label}
                    onClick={() => setContent((c) => c + "\n" + syntax)}
                    className="px-2 py-1 text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-secondary rounded transition-colors border border-transparent hover:border-border"
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Content */}
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your article in Markdown…"
                className="w-full min-h-[50vh] text-[15px] text-foreground bg-transparent placeholder:text-muted-foreground/40 resize-none focus:outline-none leading-relaxed font-mono"
                spellCheck={false}
              />
            </div>
          </div>
        )}

        {/* Preview pane */}
        {preview && (
          <div className="flex-1 overflow-y-auto bg-[#07070A]/50">
            <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8">
              {coverImageUrl && (
                <div className="mb-8 rounded-xl overflow-hidden border border-border">
                  <img src={`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:6969'}${coverImageUrl}`} alt="Cover" className="w-full h-auto max-h-[500px] object-cover" />
                </div>
              )}
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 leading-tight" style={{ fontFamily: "var(--font-display)" }}>
                {title || "Untitled article"}
              </h1>
              {tags.length > 0 && (
                <div className="flex gap-2 flex-wrap mb-6 pb-5 border-b border-border">
                  {tags.map((t) => <TagBadge key={t} label={t} />)}
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
                    h1({ children, ...props }) { return <h1 className="text-3xl font-bold text-foreground mt-8 mb-4" style={{ fontFamily: "var(--font-display)" }} {...props}>{children}</h1>; },
                    h2({ children, ...props }) { return <h2 className="text-2xl font-bold text-foreground mt-8 mb-4" style={{ fontFamily: "var(--font-display)" }} {...props}>{children}</h2>; },
                    h3({ children, ...props }) { return <h3 className="text-xl font-bold text-foreground mt-6 mb-3" style={{ fontFamily: "var(--font-display)" }} {...props}>{children}</h3>; }
                  }}
                  rehypePlugins={[rehypeSanitize]}
                >
                  {content}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
