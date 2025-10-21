import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { dracula } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useToast } from '../components/ToastContext';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:6969/api';

const PostPage = () => {
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const { id } = useParams();
  const { addToast } = useToast();

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const response = await axios.get(`${API_URL}/posts/${id}`);
        setPost(response.data);
      } catch (error) {
        console.error('Failed to fetch post:', error);
        addToast('Failed to load post.', { type: 'error' });
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [id]);

  if (loading) return <div className="skeleton" style={{ height: 380 }} />;
  if (!post) return <p>Post not found.</p>;

  return (
    <article>
      <h1>{post.title} {post.draft && <span style={{ color: '#b45309', marginLeft: 8, fontSize: '0.8rem' }}>(Draft)</span>}</h1>
      <p>By {post.username}</p>
      {(() => {
        const tags = Array.isArray(post.tags) ? post.tags : (post.tags ? [post.tags] : []);
        return tags.length > 0 ? (
          <div style={{ margin: '0.5rem 0' }}>
            {tags.map((t, i) => (
              <Link key={i} to={`/tag/${encodeURIComponent(t)}`} style={{ textDecoration: 'none' }}>
                <span style={{ display: 'inline-block', background: '#2b2b2b', color: '#fff', padding: '4px 8px', borderRadius: 999, marginRight: 8, fontSize: '0.85rem' }}>{t}</span>
              </Link>
            ))}
          </div>
        ) : null;
      })()}
      <ReactMarkdown
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
              <SyntaxHighlighter
                style={dracula}
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
      >
        {post.content}
      </ReactMarkdown>
    </article>
  );
};

export default PostPage;