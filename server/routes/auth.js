const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
const db = require('../db/db');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    message: { message: 'Too many login attempts, please try again after 15 minutes' }
});

const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    message: { message: 'Too many accounts created from this IP, please try again after an hour' }
});

const forgotPasswordLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3,
    message: { message: 'Too many password reset requests from this IP, please try again after an hour' }
});

const setAuthCookies = (res, token) => {
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('token', token, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000
    });
    res.cookie('isLoggedIn', 'true', {
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000
    });
};

router.get('/github', passport.authenticate('github', { scope: ['user:email', 'read:user'] }));

const getClientUrl = () => {
    let url = process.env.CLIENT_URL || 'http://localhost:5173';
    if (url.endsWith('/')) url = url.slice(0, -1);
    return url;
};

router.get(
    '/github/callback',
    passport.authenticate('github', { session: false, failureRedirect: `${getClientUrl()}/login` }),
    (req, res) => {
        const user = req.user;
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
            expiresIn: '30d',
        });
        setAuthCookies(res, token);
        res.redirect(`${getClientUrl()}/auth/callback`);
    }
);

router.post('/register', registerLimiter, async (req, res) => {
    try {
        let { username, email, password } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({ message: 'username, email and password are required' });
        }
        
        if (username.length > 30) return res.status(400).json({ message: 'Username cannot exceed 30 characters' });
        if (email.length > 255) return res.status(400).json({ message: 'Email cannot exceed 255 characters' });
        if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
        
        email = email.toLowerCase();

        const existing = await db.query('SELECT id FROM users WHERE email = $1 OR username = $2', [email, username]);
        if (existing.rows.length) {
            return res.status(400).json({ message: 'User with that email or username already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        const insert = await db.query(
            'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING *',
            [username, email, password_hash]
        );
        const user = insert.rows[0];
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });
        setAuthCookies(res, token);
        res.json({ token });
    } catch (err) {
        console.error('Register error:', err.message || err);
        res.status(500).json({ message: 'Server error' });
    }
});


router.post('/login', loginLimiter, async (req, res) => {
    try {
        let { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'email and password are required' });
        }
        
        email = email.toLowerCase();

        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];
        if (!user || !user.password_hash) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });
        setAuthCookies(res, token);
        res.json({ token });
    } catch (err) {
        console.error('Login error:', err.message || err);
        res.status(500).json({ message: 'Server error' });
    }
});


router.post('/logout', (req, res) => {
    const isProd = process.env.NODE_ENV === 'production';
    res.clearCookie('token', {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax'
    });
    res.clearCookie('isLoggedIn', {
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax'
    });
    res.json({ message: 'Logged out' });
});

router.get('/me', protect, async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await db.query('SELECT id, username, email, avatar_url, headline, github_id, created_at FROM users WHERE id = $1', [userId]);
        const user = result.rows[0];
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json({ user });
    } catch (err) {
        console.error('Get me error:', err.message || err);
        res.status(500).json({ message: 'Server error' });
    }
});

router.put('/me', protect, async (req, res) => {
    try {
        const userId = req.user.id;
        const { username, email, password, currentPassword, bio, avatar_url, banner_url, headline } = req.body;

        if (bio && bio.length > 500) return res.status(400).json({ message: 'Bio cannot exceed 500 characters' });
        if (headline && headline.length > 100) return res.status(400).json({ message: 'Headline cannot exceed 100 characters' });
        if (username && username.length > 30) return res.status(400).json({ message: 'Username cannot exceed 30 characters' });

        if (!username && !email && !password && bio === undefined && avatar_url === undefined && banner_url === undefined && headline === undefined) {
            return res.status(400).json({ message: 'No fields to update' });
        }

        if (username || email) {
            const check = await db.query(
                'SELECT id FROM users WHERE (username = $1 OR email = $2) AND id <> $3',
                [username || '', email || '', userId]
            );
            if (check.rows.length) {
                return res.status(400).json({ message: 'Username or email already in use' });
            }
        }

        if (password) {
            const r = await db.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
            const userRec = r.rows[0];
            if (userRec && userRec.password_hash) {
                if (!currentPassword) return res.status(400).json({ message: 'currentPassword is required to change password' });
                const match = await bcrypt.compare(currentPassword, userRec.password_hash);
                if (!match) return res.status(401).json({ message: 'Current password is incorrect' });
            }
        }

        const fields = [];
        const params = [];
        let idx = 1;

        if (username) { fields.push(`username = $${idx++}`); params.push(username); }
        if (email) { fields.push(`email = $${idx++}`); params.push(email); }
        if (bio !== undefined) { fields.push(`bio = $${idx++}`); params.push(bio); }
        if (avatar_url !== undefined) { fields.push(`avatar_url = $${idx++}`); params.push(avatar_url); }
        if (banner_url !== undefined) { fields.push(`banner_url = $${idx++}`); params.push(banner_url); }
        if (headline !== undefined) { fields.push(`headline = $${idx++}`); params.push(headline); }

        if (password) {
            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash(password, salt);
            fields.push(`password_hash = $${idx++}`);
            params.push(hash);
        }

        if (fields.length === 0) return res.status(400).json({ message: 'No fields to update' });

        params.push(userId);
        const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, username, email, avatar_url, banner_url, bio, headline, github_id, created_at`;
        const updated = await db.query(sql, params);
        res.json({ user: updated.rows[0] });
    } catch (err) {
        console.error('Update profile error:', err.message || err);
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/my-posts', protect, async (req, res) => {
    try {
        const userId = req.user.id;
        const sql = `
            SELECT 
                p.*, 
                u.username, 
                u.avatar_url,
                u.headline,
                (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) AS like_count,
                (CASE WHEN $1::INTEGER IS NOT NULL AND EXISTS (SELECT 1 FROM post_likes WHERE post_id = p.id AND user_id = $1) THEN true ELSE false END) AS user_has_liked,
                (CASE WHEN $1::INTEGER IS NOT NULL AND EXISTS (SELECT 1 FROM saved_posts WHERE post_id = p.id AND user_id = $1) THEN true ELSE false END) AS user_has_saved
            FROM posts p
            JOIN users u ON p.user_id = u.id
            WHERE p.user_id = $1 AND p.draft = false 
            ORDER BY p.created_at DESC
        `;
        const result = await db.query(sql, [userId]);
        res.json(result.rows);
    } catch (err) {
        console.error('Get my posts error:', err.message || err);
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/me/saved-posts', protect, async (req, res) => {
    try {
        const userId = req.user.id;
        const sql = `
            SELECT 
                p.*, 
                u.username, 
                u.avatar_url,
                u.headline,
                (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) AS like_count,
                (CASE WHEN $1::INTEGER IS NOT NULL AND EXISTS (SELECT 1 FROM post_likes WHERE post_id = p.id AND user_id = $1) THEN true ELSE false END) AS user_has_liked,
                (CASE WHEN $1::INTEGER IS NOT NULL AND EXISTS (SELECT 1 FROM saved_posts WHERE post_id = p.id AND user_id = $1) THEN true ELSE false END) AS user_has_saved
            FROM posts p
            JOIN saved_posts sp ON p.id = sp.post_id
            JOIN users u ON p.user_id = u.id
            WHERE sp.user_id = $1 
            ORDER BY sp.created_at DESC
        `;
        const result = await db.query(sql, [userId]);
        res.json(result.rows);
    } catch (err) {
        console.error('Get saved posts error:', err.message || err);
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/verify-password', protect, async (req, res) => {
    try {
        const { currentPassword } = req.body;
        if (!currentPassword) return res.status(400).json({ message: 'currentPassword required' });

        const userId = req.user.id;
        const result = await db.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
        const user = result.rows[0];
        if (!user || !user.password_hash) return res.status(400).json({ message: 'No password set for this account' });

        const bcrypt = require('bcryptjs');
        const match = await bcrypt.compare(currentPassword, user.password_hash);
        if (!match) return res.status(401).json({ message: 'Current password is incorrect' });

        res.json({ ok: true });
    } catch (err) {
        console.error('Verify password error:', err.message || err);
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/forgot', forgotPasswordLimiter, async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: 'email is required' });

        const result = await db.query('SELECT id, username FROM users WHERE email = $1', [email]);
        const user = result.rows[0];
        if (!user) return res.status(200).json({ message: 'If that email exists, a reset link has been sent' });

        const token = require('crypto').randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 1000 * 60 * 60);
        await db.query(`CREATE TABLE IF NOT EXISTS password_resets (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            token VARCHAR(255) NOT NULL UNIQUE,
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            used BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )`);

        await db.query('INSERT INTO password_resets (user_id, token, expires_at, used) VALUES ($1, $2, $3, $4)', [user.id, token, expiresAt, false]);

        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: Number(process.env.SMTP_PORT) || 465,
            secure: process.env.SMTP_SECURE === 'false' ? false : true,
            auth: {
                user: process.env.SMTP_USER || process.env.EMAIL_USER,
                pass: process.env.SMTP_PASS || process.env.EMAIL_PASS
            }
        });

        const resetLink = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
        const mailOptions = {
            from: process.env.FROM_EMAIL || (process.env.SMTP_USER || process.env.EMAIL_USER),
            to: email,
            subject: 'Reset your password',
            text: `Hello ${user.username || ''},\n\nYou requested a password reset. Click the link below to reset your password:\n\n${resetLink}\n\nIf you did not request this, ignore this email. Link expires in 1 hour.`,
            html: `<p>Hello ${user.username || ''},</p><p>You requested a password reset. Click the link below to reset your password:</p><p><a href="${resetLink}">${resetLink}</a></p><p>If you did not request this, ignore this email. Link expires in 1 hour.</p>`
        };

        try {
            const info = await transporter.sendMail(mailOptions);
            console.log('Forgot password email sent:', info && info.response);
        } catch (err) {
            console.error('Forgot password email error:', err);
        }

        res.json({ message: 'If that email exists, a reset link has been sent' });
    } catch (err) {
        console.error('Forgot password error:', err);
        const message = (process.env.NODE_ENV === 'production') ? 'Server error' : (err.message || String(err));
        res.status(500).json({ message });
    }
});

router.get('/reset/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const r = await db.query('SELECT id, user_id, expires_at, used FROM password_resets WHERE token = $1', [token]);
        const rec = r.rows[0];
        if (!rec) return res.status(404).json({ message: 'Invalid token' });
        if (rec.used) return res.status(400).json({ message: 'Token already used' });
        if (new Date(rec.expires_at) < new Date()) return res.status(400).json({ message: 'Token expired' });
        res.json({ ok: true });
    } catch (err) {
        console.error('Validate reset token error:', err.message || err);
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/reset/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;
        if (!password) return res.status(400).json({ message: 'password is required' });

        const r = await db.query('SELECT id, user_id, expires_at, used FROM password_resets WHERE token = $1', [token]);
        const rec = r.rows[0];
        if (!rec) return res.status(404).json({ message: 'Invalid token' });
        if (rec.used) return res.status(400).json({ message: 'Token already used' });
        if (new Date(rec.expires_at) < new Date()) return res.status(400).json({ message: 'Token expired' });

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);
        await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, rec.user_id]);

        await db.query('UPDATE password_resets SET used = true WHERE id = $1', [rec.id]);

        res.json({ message: 'Password has been reset' });
    } catch (err) {
        console.error('Reset password error:', err.message || err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
