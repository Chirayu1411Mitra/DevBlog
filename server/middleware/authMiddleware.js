const asyncHandler = require('express-async-handler');
const jwt = require('jsonwebtoken');
const db = require('../db/db');
const protect = asyncHandler(async (req, res, next) => {
    let token;
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const result = await db.query('SELECT id, username, email, avatar_url FROM users WHERE id = $1', [decoded.id]);
            if (result.rows.length === 0) {
                return res.status(401).json({ message: 'User not found' });
            }
            req.user = result.rows[0];
            return next();
        } catch (error) {
            console.error('Token verification failed:', error.message);
            return res.status(401).json({ message: 'Token verification failed' });
        }
    }

    return res.status(401).json({ message: 'No token provided' });
});

const optionalProtect = asyncHandler(async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const result = await db.query('SELECT id, username, email, avatar_url FROM users WHERE id = $1', [decoded.id]);
            req.user = result.rows[0];
        } catch (error) {
            // Don't throw an error, just proceed without a user
            console.error('Optional auth error:', error.message);
        }
    }
    next();
});

module.exports = { protect, optionalProtect };
