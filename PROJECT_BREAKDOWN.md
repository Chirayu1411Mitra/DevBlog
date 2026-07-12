# DevBlog - Full Technical Project Breakdown

> Written from scratch by reading every file in the repo. No assumptions, no hallucinations.

---

## 2. High-Level Overview

### What does this project do?

DevBlog is a full-stack developer blogging platform (live at devblog.live) where users can write, publish, discover, and bookmark technical articles written in Markdown. It supports two authentication methods (email/password and GitHub OAuth), a social graph (follow/unfollow), per-post likes, comments, tags, a drafts system, cover image uploads to S3, and user profile pages with banners, bios, and headlines.

### Full Tech Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Frontend | React | 19.1.1 | SPA UI |
| Frontend router | react-router-dom | 7.9.3 | Client-side routing |
| Frontend build | Vite + @vitejs/plugin-react | 7.1.7 | Bundler / dev server |
| Frontend Markdown | react-markdown + rehype-sanitize | 10.x / 6.x | Render and sanitise post content |
| Frontend syntax HL | react-syntax-highlighter (Prism) | 15.6.6 | Code blocks inside posts |
| Frontend date util | date-fns | 4.1.0 | formatDistanceToNow |
| Frontend HTTP | axios | 1.12.2 | API calls |
| Frontend JWT decode | jwt-decode | 4.0.0 | Imported; not visibly used in source |
| Backend runtime | Node.js | 22.x | Server runtime |
| Backend framework | Express | 4.18.2 | HTTP server |
| Backend auth local | bcryptjs + jsonwebtoken | 2.4.3 / 9.0.2 | Password hashing + JWT |
| Backend auth OAuth | passport + passport-github2 | 0.6.0 / 0.1.12 | GitHub OAuth flow |
| Backend DB driver | pg (node-postgres) | 8.11.3 | PostgreSQL connection pool |
| Backend file upload | multer + multer-s3 | 1.4.5-lts / 3.0.1 | Multipart to S3 |
| Backend S3 client | @aws-sdk/client-s3 | 3.1041.0 | AWS SDK v3 |
| Backend email | nodemailer | 9.0.1 | SMTP password-reset emails |
| Backend config | dotenv | 16.3.1 | .env loading |
| Backend error handling | express-async-handler | 1.2.0 | Async error propagation |
| Database | PostgreSQL | hosted | Persistent data store |
| File storage | AWS S3 | - | Image uploads |
| Frontend hosting | Vercel | - | Static SPA + CDN |
| Backend hosting | EC2 + Docker + Docker Compose | - | Containerised API |
| CI/CD | GitHub Actions | - | Auto-deploy on push to main |
| Tests server | Jest + supertest | 30.4.2 / 7.1.4 | Integration tests |
| Tests client | Vitest + @testing-library/react | 4.0.16 / 16.3.1 | Component tests |

### Entry Points

| Side | File | How it starts |
|---|---|---|
| Backend | server/server.js | node server.js (prod) or nodemon server.js (dev); also exports app for Jest |
| Frontend | client/src/main.jsx | Vite serves index.html, which bootstraps ReactDOM.createRoot().render() |

### Architecture (text diagram)

```
User Browser
    |
    | HTTPS (Vercel CDN)
    v
+----------------------------------------+
|  Vercel (frontend)                     |
|  React SPA -- client/dist/            |
|  All routes rewritten to index.html   |
|  VITE_API_URL env var -> EC2 backend  |
+------------------+---------------------+
                   | HTTPS REST API calls
                   | (axios, Bearer token in Authorization header)
                   v
+----------------------------------------+
|  EC2 Instance (self-hosted runner)     |
|  Docker container: devblog-api         |
|  Node 22 / Express on 127.0.0.1:6969  |
|  Nginx reverse proxy assumed in front  |
|  Passport.js for GitHub OAuth          |
|  JWT middleware (authMiddleware.js)    |
|  Routes: /api/auth /api/posts /api/users|
+-------------------+--------------------+
            | pg Pool (SSL in production)
            v
+----------------------------------------+
|  PostgreSQL (remote, DATABASE_URL)     |
|  users, posts, comments, post_likes,   |
|  saved_posts, user_follows,            |
|  password_resets                       |
+----------------------------------------+
            | AWS SDK v3 + multer-s3
            v
+----------------------------------------+
|  AWS S3 Bucket                         |
|  cover images, avatars, banners        |
|  Public S3 URL returned to client      |
+----------------------------------------+
            | nodemailer / SMTP
            v
+----------------------------------------+
|  Gmail SMTP (or any SMTP_HOST)         |
|  Password-reset emails only            |
+----------------------------------------+

GitHub OAuth:
  Browser -> GET /api/auth/github -> GitHub -> GET /api/auth/github/callback
  -> JWT signed -> redirect to /auth/callback?token=...
```

---

## 3. Folder-by-Folder / File-by-File Breakdown

### Root (d:/Blog/)

| File | Purpose |
|---|---|
| package.json | Workspace root; only scripts: {} -- no dependencies -- just a shell |
| start.bat | Windows dev shortcut: opens two cmd windows, server/npm run dev then client/npm run dev with 3-second delay |
| .gitignore | Standard Node/React ignores |
| README.md | Marketing overview; mentions live URL, tech stack |

---

### server/

#### server.js - Backend Entry Point

- Loads .env manually (handles UTF-16LE encoding quirk on Windows machines)
- Creates uploads/ directory if it does not exist (for local dev; skipped on Vercel read-only FS)
- Initialises Express, Passport, CORS
- CORS: builds an allowlist from ALLOWED_ORIGINS / CLIENT_URL env vars; in dev mode automatically adds http://localhost:5173; rejects all other origins with 403
- Serves /uploads as static dir (routes to /tmp on Vercel)
- URL-normalisation middleware: rewrites /posts/* and /auth/* to /api/posts/* and /api/auth/* (legacy compatibility shim)
- Mounts three route handlers: /api/auth, /api/posts, /api/users
- Two debug endpoints: GET /api/debug/ping (health check) and GET /api/debug/smtp-test (sends real email)
- Exports app for Jest (require.main === module guard prevents double-listen in tests)

Key imports: express, cors, passport, ./db/db, ./config/passport, ./routes/auth, ./routes/posts, ./routes/users

---

#### db/db.js - Database Module

- Creates a pg.Pool using DATABASE_URL; exits process if var is missing
- Enables SSL (rejectUnauthorized: false) when NODE_ENV=production or URL contains sslmode=require
- Inline migrations on startup (IIFE): runs ALTER TABLE ... ADD COLUMN IF NOT EXISTS for every column added after initial schema (headline, github_id, github_access_token, avatar_url, draft, tags, cover_image_url). Also CREATE TABLE IF NOT EXISTS for post_likes, saved_posts, user_follows, comments
- Exports { query, pool } -- all routes use db.query(sql, params) (parameterised queries)

Design note: Migrations are embedded in runtime startup code. Every server boot re-checks and applies schema changes idempotently.

---

#### config/passport.js - GitHub OAuth Strategy

- Registers passport-github2 strategy with clientID, clientSecret, callbackURL
- callbackURL constructed from SERVER_URL env var
- OAuth callback logic (three cases):
  1. GitHub ID already in DB -> update avatar_url + github_access_token, return existing user
  2. GitHub ID new but email matches existing user -> link GitHub to that account
  3. Completely new user -> INSERT ... ON CONFLICT (username) DO UPDATE to avoid username collision
- No serializeUser/deserializeUser (session: false throughout)

---

#### middleware/authMiddleware.js - JWT Auth Middleware

- protect: Extracts Bearer token from Authorization header -> jwt.verify(token, JWT_SECRET) -> queries DB for user -> sets req.user. Returns 401 if no token, invalid token, or user not found.
- optionalProtect: Same flow but never returns 401. If token absent or invalid, req.user stays undefined and next() is called. Used on public routes that personalise response when logged in.

---

#### routes/auth.js - Auth Routes

| Route | Auth | Description |
|---|---|---|
| GET /api/auth/github | None | Initiates GitHub OAuth, requests user:email + read:user scopes |
| GET /api/auth/github/callback | Passport | On success: signs 30-day JWT, redirects to CLIENT_URL/auth/callback?token=... |
| POST /api/auth/register | None | Validates fields, checks duplicate email/username, bcrypt hashes password (salt=10), inserts user, returns JWT |
| POST /api/auth/login | None | Looks up user by email, bcrypt.compare, returns JWT |
| GET /api/auth/me | protect | Returns current user from DB |
| PUT /api/auth/me | protect | Partial update of username/email/bio/avatar_url/banner_url/headline/password; verifies currentPassword before password change |
| GET /api/auth/my-posts | protect | Returns all published posts for logged-in user |
| GET /api/auth/me/saved-posts | protect | Returns all saved posts with author info via JOIN |
| POST /api/auth/verify-password | protect | Confirms current password is correct |
| POST /api/auth/forgot | None | Generates 32-byte random hex token, inserts into password_resets (1-hour expiry), sends reset email; always returns 200 to prevent email enumeration |
| GET /api/auth/reset/:token | None | Validates token is real, unused, and not expired |
| POST /api/auth/reset/:token | None | Same validation, then updates password_hash, marks token used=true |

---

#### routes/posts.js - Posts Routes

S3 Setup (module-level): Constructs S3Client with AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY. multer configured with multerS3 storage; key function uses req.body.type as folder prefix (blog/, profile/, banner/, other/) + Date.now() + original file extension.

| Route | Auth | Description |
|---|---|---|
| POST /api/posts/upload | protect | Accepts image field, uploads to S3, returns imageUrl |
| GET /api/posts/ | optional | All published posts ordered by created_at DESC; includes like_count, user_has_liked, user_has_saved as computed columns |
| GET /api/posts/top | optional | Top 5 posts by like_count DESC |
| GET /api/posts/search | optional | ILIKE search on title + content; optional tag filter using PostgreSQL array containment |
| GET /api/posts/my-drafts | protect | Current user's draft posts |
| GET /api/posts/tags/popular | None | Top 10 tags by usage count via unnest(tags) |
| GET /api/posts/tag/:tag | None | All posts with given tag |
| GET /api/posts/:id | optional | Single post; draft posts return 404 to non-authors; includes is_author flag |
| POST /api/posts/ | protect | Create post; deduplicates + lowercases tags |
| POST /api/posts/:id/publish | protect | Sets draft=false (ownership enforced via AND user_id = $2) |
| PUT /api/posts/:id | protect | Partial update; ownership enforced |
| DELETE /api/posts/:id | protect | Ownership enforced |
| POST /api/posts/:id/like | protect | Toggle like (check-then-insert or delete pattern) |
| POST /api/posts/:id/save | protect | Toggle save (same pattern) |
| GET /api/posts/:id/comments | None | All comments for post with author info |
| POST /api/posts/:id/comments | protect | Add comment |
| DELETE /api/posts/:postId/comments/:commentId | protect | Delete comment if user is commenter OR post author |

---

#### routes/users.js - User Routes

| Route | Auth | Description |
|---|---|---|
| GET /api/users/:username | optional | Profile with followers_count, following_count, is_following; also returns all published posts |
| POST /api/users/:id/follow | protect | Toggle follow/unfollow; prevents self-follow |
| GET /api/users/:id/followers | None | List of follower objects |
| GET /api/users/:id/following | None | List of following objects |
| DELETE /api/users/followers/:id | protect | Removes a follower from your own followers list |

---

#### server/tests/ - Integration Tests

All tests use supertest against the live Express app and the real PostgreSQL database (no mocking).

| File | What it covers |
|---|---|
| auth.test.js | Register, login, GET /me, PUT /me, saved-posts, verify-password, forgot/reset tokens |
| posts.test.js | Full CRUD lifecycle: create, draft, publish, edit, delete, like, save, comment, delete comment |
| users.test.js | Profile fetch, follow/unfollow, followers/following list, remove follower |
| server.test.js | Basic connectivity: ping, CORS preflight |

Tests clean up using afterAll that DELETEs the test user by username.

#### Dockerfile

Multi-stage build:
1. deps stage (node:22-alpine): npm ci --omit=dev (production deps only)
2. Final stage (node:22-alpine): Copies node_modules from deps, copies source, exposes 6969, CMD node server.js

#### docker-compose.yml

- Single service devblog-api; restart: unless-stopped
- Binds to 127.0.0.1:6969:6969 (loopback only)
- Loads env from .env file
- Healthcheck: wget -qO- http://localhost:6969/api/debug/ping every 30s, 3 retries

---

### client/

#### src/main.jsx - React Entry Point
ReactDOM.createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>)

#### src/App.jsx - Router Setup
- BrowserRouter with React.Suspense (lazy-loading all pages via React.lazy)
- Renders InteractiveBackground and Header outside route scope (always visible)
- 10 routes defined

#### src/components/

| Component | Purpose | Key behaviour |
|---|---|---|
| Header.jsx | Top navigation bar | Fetches current user on mount via GET /api/auth/me; clears token on 401 (auto-logout) |
| PostCard.jsx | Card for post listing | Shows cover image, author, title, content snippet (160 chars), tags, like/save buttons |
| EditProfileModal.jsx | Profile edit dialog | Handles avatar + banner file uploads via POST /api/posts/upload; calls PUT /api/auth/me on save |
| ConfirmModal.jsx | Generic confirm dialog | Used for comment deletion |
| LoginModal.jsx | Inline login prompt | Shown when guest tries to like/save |
| InteractiveBackground.jsx | Animated background | Cosmetic only |
| Loader.jsx | Loading spinner | Used as Suspense fallback and local loading state |
| NavBar.jsx | Mobile nav | Secondary navigation component |
| TagInput.jsx | Tag management | Standalone tag input with add/remove |
| UserListModal.jsx | Followers/Following modal | Shows user list with optional Unfollow / Remove Follower action |

#### src/pages/

| Page | Route | Key behaviour |
|---|---|---|
| HomePage.jsx | / | Debounced search (500ms); renders post grid; hero section only to logged-out users |
| PostPage.jsx | /post/:id | Fetches post + comments in parallel; reading progress bar; Table of Contents from headings; like/save toggle; comment add/delete; author follow card |
| LoginPage.jsx | /login | Email/password login + GitHub OAuth button; redirects if already logged in |
| RegisterPage.jsx | /register | Email/password registration |
| CreatePostPage.jsx | /create | Title, tags, Markdown textarea, cover image upload to S3; Save Draft or Publish |
| EditPostPage.jsx | /post/:id/edit | Same form pre-populated; fetches post on mount; PUT /api/posts/:id |
| UserPage.jsx | /user/:username | Profile page with banner, avatar, followers/following stats, published posts; Edit Profile modal on own profile |
| MyDraftsPage.jsx | /my-drafts | Lists drafts; Publish button calls POST /api/posts/:id/publish |
| SavedPostsPage.jsx | /saved-posts | Lists bookmarked posts |
| TagPage.jsx | /tag/:tag | All posts with a specific tag |
| AuthCallbackPage.jsx | /auth/callback | Reads ?token= from URL, stores in sessionStorage, redirects to / |
| ForgotPasswordPage.jsx | /forgot-password | Submits email; always shows success UI |
| ResetPasswordPage.jsx | /reset-password | Validates token, submits new password |

Auth token storage: All pages use sessionStorage.getItem('token') -- token is wiped on tab/browser close.

---

## 4. Workflow Traces

### 4.1 Email Registration -> Protected Route Access

```
1. User fills RegisterPage form (username, email, password)
2. POST /api/auth/register
   +-- auth.js:34 validates fields (400 if missing)
   +-- db.query SELECT WHERE email=$1 OR username=$2  (400 if duplicate)
   +-- bcrypt.genSalt(10) -> bcrypt.hash(password, salt)
   +-- db.query INSERT INTO users ... RETURNING *
   +-- jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '30d' })
   +-- res.json({ token })
3. Client: sessionStorage.setItem('token', token)
4. navigate('/')
5. Header mounts -> useEffect -> GET /api/auth/me
   +-- Authorization: Bearer <token>
   +-- authMiddleware.js:protect
       +-- jwt.verify(token, JWT_SECRET) -> decoded.id
       +-- db.query SELECT WHERE id=$1
       +-- req.user = result.rows[0]
   +-- auth.js:90 -> res.json({ user })
6. Header renders logged-in nav
```

### 4.2 GitHub OAuth Login

```
1. User clicks Sign in with GitHub on LoginPage
2. window.location.href = API_URL + /auth/github
   +-- passport.authenticate('github', { scope: ['user:email','read:user'] })
   +-- Redirects to https://github.com/login/oauth/authorize
3. User authorises -> GitHub redirects to:
   GET /api/auth/github/callback?code=...&state=...
   +-- passport.authenticate('github', { session: false })
   +-- config/passport.js GitHubStrategy callback:
       case A: github_id exists -> UPDATE token/avatar, return user
       case B: email matches existing -> link github_id to existing user
       case C: new user -> INSERT ... ON CONFLICT (username) DO UPDATE
   +-- jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '30d' })
   +-- res.redirect(CLIENT_URL + /auth/callback?token= + token)
4. AuthCallbackPage mounts
   +-- params.get('token') -> sessionStorage.setItem('token', token)
   +-- navigate('/', { replace: true })
```

### 4.3 Post Creation with Image Upload

```
1. User on CreatePostPage fills form
2. Clicks Upload Image -> file input -> handleImageUpload()
   +-- FormData: type='blog', image=<file>
   +-- POST /api/posts/upload  { Authorization: Bearer <token> }
   +-- protect middleware verifies JWT
   +-- multer + multerS3:
       key = blog/ + Date.now() + .ext   <- folder from req.body.type
   +-- S3Client.send(PutObjectCommand) via multer-s3
   +-- res.json({ imageUrl: req.file.location })  <- S3 public URL
   +-- Client: setCoverImageUrl(imageUrl)
3. User clicks Publish
   +-- POST /api/posts { title, content, draft: false, tags, cover_image_url }
   +-- protect middleware
   +-- posts.js:222 -> tags dedup + lowercase + Array.from(new Set(...))
   +-- INSERT INTO posts (title, content, user_id, draft, tags, cover_image_url) RETURNING *
   +-- res.status(201).json(newPost.rows[0])
   +-- navigate('/post/' + res.data.id)
```

### 4.4 Reading a Post (Like / Comment)

```
1. User navigates to /post/42
2. PostPage mounts -> useEffect:
   Promise.all([
     GET /api/posts/42   (optional auth),
     GET /api/posts/42/comments
   ])
   +-- posts.js:178 -> SELECT p.*, u.username, u.avatar_url, u.headline,
        (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) AS like_count,
        (EXISTS ... post_likes WHERE user_id = $2) AS user_has_liked,
        (EXISTS ... saved_posts WHERE user_id = $2) AS user_has_saved,
        (p.user_id = $2) as is_author
      FROM posts JOIN users WHERE p.id = 42
   +-- Draft check: if post.draft && post.user_id !== currentUserId -> 404
3. UI renders reading progress bar, TOC, content via ReactMarkdown + rehype-sanitize
4. User clicks heart -> handleLike()
   +-- POST /api/posts/42/like  { Authorization: Bearer <token> }
   +-- protect middleware
   +-- posts.js:322 -> SELECT * FROM post_likes WHERE user_id=$1 AND post_id=$2
       if exists -> DELETE (unlike)
       else      -> INSERT (like)
   +-- res.json({ liked: true/false })
5. User posts comment -> handleAddComment()
   +-- POST /api/posts/42/comments { content }
   +-- INSERT INTO comments (post_id, user_id, content)
   +-- SELECT username, avatar_url FROM users WHERE id=$1
   +-- res.status(201).json({ ...comment, username, avatar_url })
```

### 4.5 Password Reset Flow

```
1. ForgotPasswordPage -> POST /api/auth/forgot { email }
   +-- auth.js:219 -> SELECT id, username WHERE email=$1
   +-- If no user -> res.json(200) immediately (no information leak)
   +-- If user:
       token = crypto.randomBytes(32).toString('hex')
       expiresAt = Date.now() + 1 hour
       CREATE TABLE IF NOT EXISTS password_resets  <- table created lazily
       INSERT INTO password_resets (user_id, token, expires_at, used=false)
       nodemailer.sendMail to user's email with reset link
       res.json(200) always
2. User clicks email link -> ResetPasswordPage?token=<hex>
3. On mount -> GET /api/auth/reset/:token
   +-- SELECT from password_resets WHERE token=$1
   +-- Checks: exists (404), used (400), expired (400)
   +-- res.json({ ok: true })
4. User submits new password -> POST /api/auth/reset/:token { password }
   +-- Same validation
   +-- bcrypt.hash(password, salt=10)
   +-- UPDATE users SET password_hash=$1 WHERE id=$2
   +-- UPDATE password_resets SET used=true WHERE id=$1
   +-- res.json({ message: 'Password has been reset' })
```

### 4.6 CI/CD Pipeline

```
Trigger: push to branch main

Job 1: deploy-backend (self-hosted EC2 runner)
  1. cd /var/www/devblog
  2. git config pull.rebase false
  3. git pull origin main
  4. cd server
  5. docker compose up --build -d
  6. docker image prune -f
  NOTE: No checkout action -- runner has repo pre-cloned at /var/www/devblog

Job 2: deploy-frontend (ubuntu-latest GitHub runner)
  1. actions/checkout@v4
  2. npm install -g vercel@latest
  3. npm install (in client/)
  4. find . -name '.vercel' -type d -exec rm -rf {}  (clear cache)
  5. vercel pull --yes --environment=production --token=$VERCEL_TOKEN
  6. vercel build --prod --token=$VERCEL_TOKEN  (runs vite build, generates dist/)
  7. vercel deploy --prebuilt --prod --token=$VERCEL_TOKEN  (uploads dist/ to CDN)
  Secrets: VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID
```

### 4.7 Request Security Chain

```
Client sends: POST /api/posts { title, content }
              Authorization: Bearer eyJhbGci...

1. CORS check (server.js:62-76)
   - Origin extracted from request header
   - normalizeOrigin() strips trailing slash
   - if origin not in allowlist -> Error('Not allowed by CORS') -> 403

2. express.json() parses body

3. Route matched -> protect middleware (authMiddleware.js:4)
   - Checks Authorization header starts with 'Bearer'
   - token = header.split(' ')[1]
   - jwt.verify(token, JWT_SECRET) -> throws if expired or tampered
   - SELECT id, username, email, avatar_url FROM users WHERE id=$1
     (DB re-fetch means deleted accounts cannot use old tokens)
   - req.user = db row

4. Route handler (posts.js:222)
   - authorId = req.user.id  (not from request body)
   - Tags sanitised (lowercase, dedup)
   - Parameterised query -> no SQL injection possible

5. Ownership enforcement:
   PUT /api/posts/:id  -> WHERE id=$1 AND user_id=$2
   DELETE /api/posts/:id -> WHERE id=$1 AND user_id=$2
   (0 rows affected if user does not own resource -> 404)
   This is the IDOR protection pattern used throughout.
```

---

## 5. Data Layer

### Full Schema

```sql
CREATE TABLE users (
    id               SERIAL PRIMARY KEY,
    username         VARCHAR(255) UNIQUE NOT NULL,
    email            VARCHAR(255) UNIQUE,
    password_hash    VARCHAR(255),        -- null for GitHub-only accounts
    github_id        VARCHAR(255) UNIQUE, -- null for email-only accounts
    github_access_token TEXT,            -- latest GitHub OAuth token (plaintext!)
    avatar_url       VARCHAR(255),        -- S3 URL or GitHub avatar URL
    banner_url       VARCHAR(255),        -- S3 URL for profile banner
    bio              TEXT,
    headline         VARCHAR(255),        -- e.g. Senior Engineer at Acme
    author_id        INTEGER REFERENCES users(id) ON DELETE SET NULL, -- UNUSED
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE posts (
    id               SERIAL PRIMARY KEY,
    user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title            VARCHAR(255) NOT NULL,
    content          TEXT,                -- raw Markdown
    cover_image_url  VARCHAR(255),        -- S3 URL
    tags             TEXT[] DEFAULT '{}', -- PostgreSQL native text array
    draft            BOOLEAN DEFAULT FALSE,
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE comments (
    id               SERIAL PRIMARY KEY,
    post_id          INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content          TEXT NOT NULL,
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE post_likes (
    user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id          INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, post_id)  -- composite PK prevents duplicates
);

CREATE TABLE saved_posts (
    user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id          INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, post_id)
);

CREATE TABLE user_follows (
    follower_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (follower_id, following_id)
);

-- Created lazily inside POST /api/auth/forgot handler:
CREATE TABLE password_resets (
    id               SERIAL PRIMARY KEY,
    user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token            VARCHAR(255) NOT NULL UNIQUE,
    expires_at       TIMESTAMP WITH TIME ZONE NOT NULL,
    used             BOOLEAN DEFAULT FALSE,
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Entity Relationships

```
users --< posts          (1 user -> many posts)
users --< comments       (1 user -> many comments)
posts --< comments       (1 post -> many comments)
users -< post_likes >- posts   (many-to-many via composite PK)
users -< saved_posts >- posts  (many-to-many)
users -< user_follows >- users (self-referential many-to-many)
users --< password_resets      (1 user -> many reset tokens)
```

### Indexes

No explicit CREATE INDEX statements in the schema. Implicit indexes only:
- PRIMARY KEY on every id column -> B-tree index
- UNIQUE on users.username, users.email, users.github_id -> B-tree
- Composite PRIMARY KEY (user_id, post_id) on post_likes, saved_posts
- Composite PRIMARY KEY (follower_id, following_id) on user_follows

Missing: No index on posts.user_id, posts.draft, posts.tags, comments.post_id, post_likes.post_id, user_follows.following_id. The correlated subqueries in GET /api/posts/ will do sequential scans on post_likes at scale.

---

## 6. Infra & Config

### Environment Variables - Server (server/.env)

| Variable | What it configures |
|---|---|
| DATABASE_URL | Full PostgreSQL connection string |
| JWT_SECRET | Secret used to sign and verify all JWTs |
| CLIENT_URL | Frontend origin -- used in CORS allowlist + email reset links + GitHub callback redirect |
| ALLOWED_ORIGINS | Comma-separated list of additional allowed CORS origins |
| SERVER_URL | Backend public URL -- used to construct callbackURL in passport.js |
| GITHUB_CLIENT_ID | GitHub OAuth App client ID |
| GITHUB_CLIENT_SECRET | GitHub OAuth App client secret |
| AWS_REGION | S3 bucket region |
| AWS_ACCESS_KEY_ID | AWS IAM access key with S3 put permissions |
| AWS_SECRET_ACCESS_KEY | Corresponding secret key |
| AWS_S3_BUCKET_NAME | S3 bucket name where images are stored |
| SMTP_HOST | SMTP server hostname (defaults to smtp.gmail.com) |
| SMTP_PORT | SMTP port (defaults to 465) |
| SMTP_SECURE | 'false' to disable TLS; otherwise TLS enabled |
| SMTP_USER / EMAIL_USER | SMTP username / Gmail address |
| SMTP_PASS / EMAIL_PASS | SMTP password / App password |
| FROM_EMAIL | Sender address in password-reset emails |
| PORT | HTTP listen port (defaults to 6969) |
| NODE_ENV | production or development -- affects SSL, CORS, error messages |
| VERCEL | Set by Vercel serverless env; used to route uploads to /tmp |

### Environment Variables - Client (client/.env)

| Variable | What it configures |
|---|---|
| VITE_API_URL | Backend API base URL -- baked into the JS bundle at build time |

### CI/CD GitHub Secrets

| Secret | Used for |
|---|---|
| VERCEL_TOKEN | Authenticates Vercel CLI |
| VERCEL_ORG_ID | Identifies the Vercel org |
| VERCEL_PROJECT_ID | Identifies the Vercel project |

### Dockerfile Explained

```dockerfile
# Stage 1: install production dependencies only
FROM node:22-alpine AS deps      # lightweight Alpine image
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev            # skip devDependencies

# Stage 2: final lean image
FROM node:22-alpine
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .                         # .dockerignore excludes .env, uploads, tests
EXPOSE 6969
CMD ["node", "server.js"]
```

### Vercel Config Explained

client/vercel.json: All URLs rewritten to index.html. Mandatory for SPA client-side routing.

server/vercel.json: Would deploy Express as a Vercel serverless function. NOT used in production -- backend deploys to EC2 via Docker. Leftover from an earlier experiment.

### Security Measures Actually Implemented in Code

1. SQL Injection Prevention -- parameterised placeholders throughout:
```js
// posts.js:305
db.query('DELETE FROM posts WHERE id = $1 AND user_id = $2 RETURNING id', [intId, userId])
```

2. IDOR Prevention -- every mutation includes AND user_id = $N:
```js
// posts.js:288
UPDATE posts SET ... WHERE id = $N AND user_id = $N RETURNING *
```

3. Password Hashing -- bcrypt salt factor 10:
```js
const salt = await bcrypt.genSalt(10);
const password_hash = await bcrypt.hash(password, salt);
```

4. Email Enumeration Prevention -- always returns 200:
```js
// auth.js:221
if (!user) return res.status(200).json({ message: 'If that email exists, a reset link has been sent' });
```

5. Token Re-Use Prevention -- single-use tokens with 1-hour TTL via used=true flag.

6. Draft Visibility Enforcement:
```js
// posts.js:211-213
if (post.draft && post.user_id !== currentUserId) {
    return res.status(404).json({ message: 'Post Not Found' });
}
```

7. Comment Deletion Authorization -- commenter OR post author:
```js
WHERE c.id = $1 AND (c.user_id = $2 OR p.user_id = $2)
```

8. CORS Allowlist -- only explicitly listed origins can make credentialed cross-origin requests.

9. Docker port bound to loopback -- 127.0.0.1:6969:6969 means not reachable from public internet directly.

---

## 7. Gaps & Weak Points

### 7.1 No Rate Limiting

Zero rate limiting on any endpoint. Directly exploitable:
- POST /api/auth/login -> unlimited brute-force password attempts
- POST /api/auth/forgot -> spam to flood victim's inbox or consume SMTP quota
- POST /api/auth/register -> bulk enumerate usernames/emails

Fix: express-rate-limit middleware on auth routes.

### 7.2 Inline Schema Migrations (Startup IIFE)

db.js runs ALTER TABLE ... ADD COLUMN IF NOT EXISTS on every server boot:
- Adds ~7 DB round-trips to every cold start
- No migration history/versioning -- cannot roll back
- password_resets table created inside a request handler -- DDL inside DML handler is an anti-pattern

Fix: Use a proper migration tool (node-pg-migrate, Flyway, Knex migrations).

### 7.3 Token Stored in sessionStorage

sessionStorage.setItem('token', token)  // LoginPage.jsx:24
- sessionStorage is accessible to any same-origin JavaScript -- XSS can steal the token
- No HttpOnly cookie is used
- rehype-sanitize mitigates stored XSS in post content, but attack surface remains large

### 7.4 No Input Validation Beyond Existence Checks

Fields like title, content, bio, headline have no length limits at the API layer. A user can send a 100MB content body and it gets stored. No express-validator or Zod schema validation.

### 7.5 Like/Save Toggle is a Race Condition

Check-then-act pattern:
```js
const likeResult = await db.query('SELECT * FROM post_likes WHERE ...');
if (likeResult.rows.length > 0) { DELETE ... } else { INSERT ... }
```
Two simultaneous requests can both read not-liked and both attempt INSERT -> duplicate key error (PG error 23505). Code handles with 409 response but UX is inconsistent.

Fix: Use INSERT ... ON CONFLICT DO NOTHING + DELETE in a single atomic operation.

### 7.6 No Pagination

GET /api/posts/ returns ALL posts in the database in one query. At 10,000 posts, correlated subqueries (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) evaluated per row make this extremely slow.

Fix: Cursor-based or offset pagination; materialise like_count as a column updated by trigger.

### 7.7 No Index on Foreign Keys

post_likes.post_id, comments.post_id, user_follows.following_id have no secondary indexes. At 1,000 posts x 1 subquery each = 1,000 sequential scans on post_likes per page load.

### 7.8 AWS Credentials Loaded From .env

No IAM role assignment (EC2 instance profile). If .env file leaks, the AWS account is compromised. No visible IAM policy scoping to minimum permissions.

### 7.9 S3 Images Are Presumably Public

No pre-signed URL generation -- req.file.location (the S3 URL) returned directly. Implies public-read bucket. No file content-type validation beyond AUTO_CONTENT_TYPE which trusts file extensions.

### 7.10 author_id Column is Vestigial

The schema has:
```sql
author_id INTEGER REFERENCES users(id) ON DELETE SET NULL
```
This self-referential FK on users is never read or written anywhere in the codebase. Dead schema.

### 7.11 Unauthenticated Debug Endpoint in Production

GET /api/debug/smtp-test sends a real email to SMTP_USER with no authentication required:
```js
app.get('/api/debug/smtp-test', async (req, res) => { ... nodemailer.sendMail(...) })
```
Can be used to spam the SMTP account or confirm SMTP credentials are working.

### 7.12 password_resets Table Created Inside a Request Handler

```js
// auth.js:225-232
await db.query('CREATE TABLE IF NOT EXISTS password_resets (...)');
```
DDL statement inside a DML handler on every forgot-password request. Anti-pattern; adds latency.

### 7.13 No Retry Logic for Email Sending

nodemailer.sendMail uses fire-and-forget callback. If SMTP fails, reset token is already in DB. User gets 200 but never receives email. No cleanup of unused expired tokens.

### 7.14 Test Suite Hits the Real Database

Tests use supertest against the live app with the real DB connection. No test database, no transaction rollback between tests, no mocking. Running npm test in production environment would create and delete real users.

### 7.15 Parallel CI/CD Jobs With No Dependency

Frontend deployment can succeed before backend deployment completes. New frontend can hit old backend during the deploy window if API shape changed.

### 7.16 github_access_token Stored Unencrypted

```sql
github_access_token TEXT
```
GitHub OAuth tokens stored as plaintext in DB. Database compromise = all users GitHub tokens exposed.

---

*End of PROJECT_BREAKDOWN.md*
