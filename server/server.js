const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

const envPath = path.join(__dirname, '.env');

const uploadsDir = path.join(__dirname, 'uploads');
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
  }
} catch (err) {
  console.warn('Could not create uploads directory (likely read-only filesystem). Uploads will not persist.');
}

if (fs.existsSync(envPath)) {
  try {
    let envConfig = dotenv.parse(fs.readFileSync(envPath));

    if (!envConfig.DATABASE_URL) {
      const envContent = fs.readFileSync(envPath, 'utf16le');
      envConfig = dotenv.parse(envContent);
    }

    for (const k in envConfig) {
      process.env[k] = envConfig[k];
    }
  } catch (e) {
    console.error('Error loading .env file:', e);
  }
} else {
  dotenv.config();
}

const express = require('express');
const cors = require('cors');
const passport = require('passport');
const cookieParser = require('cookie-parser');
const db = require('./db/db');
const app = express();
require('./config/passport')(passport);
app.use(passport.initialize());
app.use(cookieParser());

const normalizeOrigin = (value) => {
  if (!value) return '';
  try {
    const trimmed = String(value).trim();
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
const isDev = (process.env.NODE_ENV || '').toLowerCase() !== 'production';
const allowlist = Array.from(new Set([...envAllowed, ...(isDev ? defaultDevOrigins : [])]));

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const normalized = normalizeOrigin(origin);
    if (allowlist.includes(normalized)) {
      return callback(null, true);
    }
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
app.use(express.urlencoded({ extended: false }));

const staticDir = process.env.VERCEL || process.env.NODE_ENV === 'production' ? '/tmp' : path.join(__dirname, 'uploads');
app.use('/uploads', express.static(staticDir));

app.use((req, _res, next) => {
  const p = req.path || '';
  if (!p.startsWith('/api/') && (p.startsWith('/posts') || p.startsWith('/auth'))) {
    req.url = `/api${req.url}`;
  }
  next();
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/users', require('./routes/users'));

app.get('/api/debug/ping', (req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV || 'development' });
});

app.get('/api/debug/smtp-test', async (req, res) => {
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

app.get('/', (req, res) => {
  res.send("Welcome")
});

const PORT = process.env.PORT || 6969;

if (require.main === module) {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;