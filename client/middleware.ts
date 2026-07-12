import { next } from '@vercel/functions';

export const config = {
  matcher: '/post/:path*',
};

const BOT_USER_AGENTS = /Twitterbot|facebookexternalhit|Slackbot|Discordbot|LinkedInBot|WhatsApp|TelegramBot|Googlebot|bingbot/i;

export default async function middleware(request: Request) {
  const url = new URL(request.url);
  const userAgent = request.headers.get('user-agent') || '';

  // 1. If not a bot, pass through unchanged to SPA
  if (!BOT_USER_AGENTS.test(userAgent)) {
    return next();
  }

  // 2. Parse the ID from the path (e.g., /post/11-slug)
  const pathParts = url.pathname.split('/');
  if (pathParts.length < 3) return next();

  const idSlug = pathParts[2];
  const id = idSlug.split('-')[0];
  const intId = parseInt(id, 10);

  if (Number.isNaN(intId)) {
    return next();
  }

  // 3. Fetch post from API
  const apiUrl = process.env.VITE_API_URL || 'http://localhost:6969/api';
  
  try {
    const response = await fetch(`${apiUrl}/posts/${intId}`);
    if (!response.ok) {
      return next();
    }
    
    const post = await response.json();
    
    // Construct HTML with OG tags
    const siteUrl = url.origin;
    const ogUrl = `${siteUrl}/post/${post.id}${post.slug ? `-${post.slug}` : ''}`;
    const coverImage = post.cover_image_url
      ? (post.cover_image_url.startsWith('http') ? post.cover_image_url : `${apiUrl.replace('/api', '')}${post.cover_image_url}`)
      : '';
      
    // Truncate description for meta tag (e.g. max 150 chars)
    const rawContent = post.content || '';
    // Strip markdown chars roughly
    const cleanContent = rawContent.replace(/[#*`_\[\]()]/g, '').slice(0, 150).trim() + '...';

    const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>${post.title} - DevBlog</title>
    <link rel="canonical" href="${ogUrl}" />
    
    <meta name="description" content="${cleanContent}" />
    
    <!-- OpenGraph Tags -->
    <meta property="og:title" content="${post.title}" />
    <meta property="og:description" content="${cleanContent}" />
    <meta property="og:url" content="${ogUrl}" />
    <meta property="og:type" content="article" />
    ${coverImage ? `<meta property="og:image" content="${coverImage}" />` : ''}
    
    <!-- Twitter Cards -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${post.title}" />
    <meta name="twitter:description" content="${cleanContent}" />
    ${coverImage ? `<meta name="twitter:image" content="${coverImage}" />` : ''}
  </head>
  <body>
    <script>window.location.href = "${ogUrl}";</script>
  </body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });

  } catch (error) {
    console.error('Middleware fetch error:', error);
    return next();
  }
}
