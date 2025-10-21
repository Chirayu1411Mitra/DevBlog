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


// --- GitHub OAuth ---
router.get('/github', passport.authenticate('github', { scope: ['user:email', 'read:user'] }));

router.get(
    '/github/callback',
    passport.authenticate('github', { session: false, failureRedirect: `${process.env.CLIENT_URL}/login` }),
    (req, res) => {
        const user = req.user;
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
            expiresIn: '30d',
        });
        res.redirect(`${process.env.CLIENT_URL}/auth/callback?token=${token}`);
    }
);

// --- Email/password register ---
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({ message: 'username, email and password are required' });
        }

        // check existing user by email or username
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
        res.json({ token });
    } catch (err) {
        console.error('Register error:', err.message || err);
        res.status(500).json({ message: 'Server error' });
    }
});


// --- Email/password login ---
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'email and password are required' });
        }

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
        res.json({ token });
    } catch (err) {
        console.error('Login error:', err.message || err);
        res.status(500).json({ message: 'Server error' });
    }
});


// Return the authenticated user's info (without sensitive fields)
router.get('/me', protect, async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await db.query('SELECT id, username, email, avatar_url, github_id, created_at FROM users WHERE id = $1', [userId]);
        const user = result.rows[0];
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json({ user });
    } catch (err) {
        console.error('Get me error:', err.message || err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update current user's profile (username, email, password)
router.put('/me', protect, async (req, res) => {
    try {
        const userId = req.user.id;
        const { username, email, password, currentPassword } = req.body;

        // Validate presence of at least one field
        if (!username && !email && !password) {
            return res.status(400).json({ message: 'No fields to update' });
        }

        // Check uniqueness for username/email if provided
        if (username || email) {
            const check = await db.query(
                'SELECT id FROM users WHERE (username = $1 OR email = $2) AND id <> $3',
                [username || '', email || '', userId]
            );
            if (check.rows.length) {
                return res.status(400).json({ message: 'Username or email already in use' });
            }
        }

        // If password is being changed, verify currentPassword if an existing password exists
        if (password) {
            const r = await db.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
            const userRec = r.rows[0];
            if (userRec && userRec.password_hash) {
                if (!currentPassword) return res.status(400).json({ message: 'currentPassword is required to change password' });
                const match = await bcrypt.compare(currentPassword, userRec.password_hash);
                if (!match) return res.status(401).json({ message: 'Current password is incorrect' });
            }
            // if no existing password_hash (e.g., OAuth only), allow setting password without currentPassword
        }

        // Build update dynamically
        const fields = [];
        const params = [];
        let idx = 1;
        if (username) { fields.push(`username = $${idx++}`); params.push(username); }
        if (email) { fields.push(`email = $${idx++}`); params.push(email); }
        if (password) {
            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash(password, salt);
            fields.push(`password_hash = $${idx++}`);
            params.push(hash);
        }

        params.push(userId);
        const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, username, email, avatar_url, github_id, created_at`;
        const updated = await db.query(sql, params);
        res.json({ user: updated.rows[0] });
    } catch (err) {
        console.error('Update profile error:', err.message || err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get posts authored by the current user
router.get('/my-posts', protect, async (req, res) => {
    try {
        const userId = req.user.id;
        // Return only published posts for the profile view; drafts are returned via the dedicated my-drafts endpoint
        const result = await db.query('SELECT * FROM posts WHERE author_id = $1 AND draft = false ORDER BY created_at DESC', [userId]);
        res.json(result.rows);
    } catch (err) {
        console.error('Get my posts error:', err.message || err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Verify current password (used before allowing password change)
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

// --- Forgot password: create reset token and send email ---
router.post('/forgot', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: 'email is required' });

        const result = await db.query('SELECT id, username FROM users WHERE email = $1', [email]);
        const user = result.rows[0];
        if (!user) return res.status(200).json({ message: 'If that email exists, a reset link has been sent' });

        // create token
        const token = require('crypto').randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour
        // ensure table exists (defensive in case schema wasn't applied)
        await db.query(`CREATE TABLE IF NOT EXISTS password_resets (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            token VARCHAR(255) NOT NULL UNIQUE,
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            used BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )`);

        await db.query('INSERT INTO password_resets (user_id, token, expires_at, used) VALUES ($1, $2, $3, $4)', [user.id, token, expiresAt, false]);

        // prepare transporter (SMTP config via env)
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: Number(process.env.SMTP_PORT) || 465,
            secure: process.env.SMTP_SECURE === 'false' ? false : true,
            auth: {
                user: process.env.SMTP_USER || process.env.EMAIL_USER,
                pass: process.env.SMTP_PASS || process.env.EMAIL_PASS // keep space for app password
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

        // send mail (don't fail if transporter not configured properly - fail silently)
        transporter.sendMail(mailOptions, (err, info) => {
            if (err) {
                console.error('Forgot password email error:', err);
            } else {
                console.log('Forgot password email sent:', info && info.response);
            }
        });

        res.json({ message: 'If that email exists, a reset link has been sent' });
    } catch (err) {
        console.error('Forgot password error:', err);
        const message = (process.env.NODE_ENV === 'production') ? 'Server error' : (err.message || String(err));
        res.status(500).json({ message });
    }
});

// Validate reset token
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

// Perform reset: set new password
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

        // update user's password
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);
        await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, rec.user_id]);

        // mark token used
        await db.query('UPDATE password_resets SET used = true WHERE id = $1', [rec.id]);

        res.json({ message: 'Password has been reset' });
    } catch (err) {
        console.error('Reset password error:', err.message || err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
