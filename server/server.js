// Load .env from the server folder (use __dirname so dotenv finds server/.env

// 1. Load path and dotenv AT THE VERY TOP
const path = require('path');
const fs = require('fs');
const envPath = path.join(__dirname, '.env');
const dotenv = require('dotenv');

// Check if .env exists and load it with correct encoding
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf16le');
  const parsed = dotenv.parse(envContent);
  process.env = { ...process.env, ...parsed };
} else {
  // For deployment environments like Render, env vars are set directly
  dotenv.config();
}

// 2. Now, load all your other modules
const express = require('express');
const cors = require('cors');
const passport = require('passport');

// --- Rest of your code ---
const app = express();
require('./config/passport')(passport);
app.use(passport.initialize());

// Robust CORS allowlist with normalized origins and preflight support
const normalizeOrigin = (value) => {
  if (!value) return '';
  try {
    const trimmed = String(value).trim();
    // Remove trailing slashes for consistent comparisons
    return trimmed.replace(/\/$/, '');
  } catch (_) {
    return '';
  }
};

const envAllowed = (process.env.ALLOWED_ORIGINS || process.env.CLIENT_URL || '')
  .split(',')
  .map(normalizeOrigin)
  .filter(Boolean);

const defaultDevOrigins = ['http://localhost:5173'];
// Treat missing NODE_ENV as development locally
const isDev = (process.env.NODE_ENV || '').toLowerCase() !== 'production';
const allowlist = Array.from(new Set([...envAllowed, ...(isDev ? defaultDevOrigins : [])]));

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, SSR)
    if (!origin) return callback(null, true);
    const normalized = normalizeOrigin(origin);
    if (allowlist.includes(normalized)) {
      return callback(null, true);
    }
    // Explicitly reject other origins
    return callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204,
  preflightContinue: false,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({extended: false}));

// Compatibility shim: if client forgets the /api prefix, rewrite to /api/*
app.use((req, _res, next) => {
  const p = req.path || '';
  if (!p.startsWith('/api/') && (p.startsWith('/posts') || p.startsWith('/auth'))) {
    req.url = `/api${req.url}`;
  }
  next();
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/posts', require('./routes/posts'));

// Dev/debug endpoints
app.get('/api/debug/ping', (req, res) => {
    res.json({ ok: true, env: process.env.NODE_ENV || 'development' });
});

app.get('/api/debug/smtp-test', async (req, res) => {
    // send a small test email using the current SMTP settings
    const nodemailer = require('nodemailer');
    try {
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: Number(process.env.SMTP_PORT) || 465,
            secure: process.env.SMTP_SECURE === 'false' ? false : true,
            auth: {
                user: process.env.SMTP_USER || process.env.EMAIL_USER,
                pass: process.env.SMTP_PASS || process.env.EMAIL_PASS
            }
        });

        const info = await transporter.sendMail({
            from: process.env.FROM_EMAIL || process.env.SMTP_USER,
            to: process.env.SMTP_USER,
            subject: 'DevBlog SMTP test',
            text: 'This is a test message from DevBlog.'
        });
        res.json({ ok: true, info: info && info.response });
    } catch (err) {
        console.error('SMTP test error:', err);
        res.status(500).json({ ok: false, error: err.message || String(err) });
    }
});

app.get('/', (req, res)=>{
    res.send("Welcome")
});

const PORT = process.env.PORT || 6969;

app.listen(PORT, ()=> console.log( `Server running on port ${PORT}`));