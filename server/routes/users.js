const express = require('express');
const db = require('../db/db');
const { optionalProtect, protect } = require('../middleware/authMiddleware');
const router = express.Router();

router.get('/:username', optionalProtect, async (req, res) => {
    try {
        const { username } = req.params;
        const currentUserId = req.user ? req.user.id : null;

        const userSql = `
            SELECT 
                u.id, u.username, u.avatar_url, u.banner_url, u.bio, u.headline, u.created_at,
                (SELECT COUNT(*) FROM user_follows WHERE following_id = u.id) as followers_count,
                (SELECT COUNT(*) FROM user_follows WHERE follower_id = u.id) as following_count,
                (CASE WHEN $2::INTEGER IS NOT NULL AND EXISTS (SELECT 1 FROM user_follows WHERE follower_id = $2 AND following_id = u.id) THEN true ELSE false END) as is_following
            FROM users u
            WHERE u.username = $1
        `;
        const userResult = await db.query(userSql, [username, currentUserId]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const user = userResult.rows[0];

        const postsResult = await db.query(
            `SELECT 
                p.*, 
                u.username, 
                u.avatar_url,
                (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) AS like_count,
                (CASE WHEN $2::INTEGER IS NOT NULL AND EXISTS (SELECT 1 FROM post_likes WHERE post_id = p.id AND user_id = $2) THEN true ELSE false END) AS user_has_liked,
                (CASE WHEN $2::INTEGER IS NOT NULL AND EXISTS (SELECT 1 FROM saved_posts WHERE post_id = p.id AND user_id = $2) THEN true ELSE false END) AS user_has_saved
            FROM posts p
            JOIN users u ON p.user_id = u.id
            WHERE p.user_id = $1 AND p.draft = false 
            ORDER BY p.created_at DESC`,
            [user.id, currentUserId]
        );

        res.json({ user, posts: postsResult.rows });
    } catch (err) {
        console.error('Get user profile error:', err.message);
        res.status(500).send('Server error');
    }
});

router.post('/:id/follow', protect, async (req, res) => {
    try {
        const followingId = parseInt(req.params.id, 10);
        const followerId = req.user.id;

        if (followerId === followingId) {
            return res.status(400).json({ message: 'You cannot follow yourself.' });
        }

        const followResult = await db.query(
            'SELECT * FROM user_follows WHERE follower_id = $1 AND following_id = $2',
            [followerId, followingId]
        );

        if (followResult.rows.length > 0) {
            await db.query(
                'DELETE FROM user_follows WHERE follower_id = $1 AND following_id = $2',
                [followerId, followingId]
            );
            res.json({ following: false, message: 'User unfollowed.' });
        } else {
            await db.query(
                'INSERT INTO user_follows (follower_id, following_id) VALUES ($1, $2)',
                [followerId, followingId]
            );
            res.json({ following: true, message: 'User followed.' });
        }
    } catch (err) {
        console.error('Follow/unfollow error:', err.message);
        res.status(500).send('Server error');
    }
});

router.get('/:id/followers', async (req, res) => {
    try {
        const { id } = req.params;
        const intId = parseInt(id, 10);
        if (Number.isNaN(intId)) return res.status(404).json({ message: 'User not found' });

        const sql = `
            SELECT u.id, u.username, u.avatar_url
            FROM user_follows uf
            JOIN users u ON uf.follower_id = u.id
            WHERE uf.following_id = $1
        `;
        const result = await db.query(sql, [intId]);
        res.json(result.rows);
    } catch (err) {
        console.error('Get followers error:', err.message);
        res.status(500).send('Server error');
    }
});

router.get('/:id/following', async (req, res) => {
    try {
        const { id } = req.params;
        const intId = parseInt(id, 10);
        if (Number.isNaN(intId)) return res.status(404).json({ message: 'User not found' });

        const sql = `
            SELECT u.id, u.username, u.avatar_url
            FROM user_follows uf
            JOIN users u ON uf.following_id = u.id
            WHERE uf.follower_id = $1
        `;
        const result = await db.query(sql, [intId]);
        res.json(result.rows);
    } catch (err) {
        console.error('Get following error:', err.message);
        res.status(500).send('Server error');
    }
});

router.delete('/followers/:id', protect, async (req, res) => {
    try {
        const followerId = parseInt(req.params.id, 10);
        const currentUserId = req.user.id;

        if (Number.isNaN(followerId)) return res.status(404).json({ message: 'User not found' });

        await db.query(
            'DELETE FROM user_follows WHERE follower_id = $1 AND following_id = $2',
            [followerId, currentUserId]
        );

        res.json({ message: 'Follower removed' });
    } catch (err) {
        console.error('Remove follower error:', err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;
