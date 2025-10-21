const express = require('express');
const db = require('../db/db');
const {protect} =  require('../middleware/authMiddleware');
const router = express.Router();


// GET all posts
router.get('/', async (req, res) => {
    try {
        const result = await db.query(
            'SELECT posts.*, users.username, users.avatar_url FROM posts JOIN users ON posts.author_id = users.id WHERE posts.draft = false ORDER BY posts.created_at DESC'
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Search posts (place before the `/:id` route so "search" isn't treated as an id)
router.get('/search', async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) {
            return res.status(400).json({ message: 'please enter something' });
        }

        const searchTerm = `%${q}%`;
        // Optionally allow filtering by tag: /search?q=react&tag=javascript
        const { tag } = req.query;
        let sql;
        let params;
        if (tag) {
            // Use Postgres array containment to match posts that have the tag
            sql = 'SELECT posts.*, users.username, users.avatar_url FROM posts JOIN users ON posts.author_id = users.id WHERE (posts.title ILIKE $1 OR posts.content ILIKE $1) AND posts.draft = false AND posts.tags @> ARRAY[$2]::text[] ORDER BY posts.created_at DESC';
            params = [searchTerm, tag];
        } else {
            sql = 'SELECT posts.*, users.username, users.avatar_url FROM posts JOIN users ON posts.author_id = users.id WHERE (posts.title ILIKE $1 OR posts.content ILIKE $1) AND posts.draft = false ORDER BY posts.created_at DESC';
            params = [searchTerm];
        }
        const result = await db.query(sql, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Get drafts for current user (protected)
router.get('/my-drafts', protect, async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await db.query('SELECT * FROM posts WHERE author_id = $1 AND draft = true ORDER BY created_at DESC', [userId]);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Get published posts by tag
router.get('/tag/:tag', async (req, res) => {
    try {
        const { tag } = req.params;
        const result = await db.query(
            'SELECT posts.*, users.username, users.avatar_url FROM posts JOIN users ON posts.author_id = users.id WHERE posts.draft = false AND posts.tags @> ARRAY[$1]::text[] ORDER BY posts.created_at DESC',
            [tag]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Get posts by tag error:', err.message || err);
        res.status(500).send('Server error');
    }
});

// GET a specific post by id
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Guard: only accept numeric ids to avoid SQL errors when static routes are accidentally hit
        const intId = parseInt(id, 10);
        if (Number.isNaN(intId)) {
            return res.status(404).json({ message: 'Post Not Found' });
        }

        const result = await db.query(
            'SELECT posts.*, users.username, users.avatar_url FROM posts JOIN users ON posts.author_id = users.id WHERE posts.id = $1',
            [intId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Post Not Found' });
        }

        const post = result.rows[0];

        // If the post is a draft, only return it to the author. Do not reveal existence to others.
        if (post.draft) {
            // Expect Authorization: Bearer <token>
            const auth = req.headers.authorization || '';
            const parts = auth.split(' ');
            if (parts.length !== 2 || parts[0] !== 'Bearer') {
                // hide existence
                return res.status(404).json({ message: 'Post Not Found' });
            }
            const token = parts[1];
            try {
                const jwt = require('jsonwebtoken');
                const payload = jwt.verify(token, process.env.JWT_SECRET);
                if (!payload || payload.id !== post.author_id) {
                    return res.status(404).json({ message: 'Post Not Found' });
                }
                // authorized, return the draft
                return res.json(post);
            } catch (err) {
                console.error('Draft access error:', err.message || err);
                return res.status(404).json({ message: 'Post Not Found' });
            }
        }

        // published post
        res.json(post);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// CREATE a new post (protected)
router.post('/', protect, async (req, res) => {
    try {
        const { title, content, draft, tags } = req.body;
        const authorId = req.user.id;

    // normalize tags: accept array or comma-separated string
    let tagsArr = [];
    if (Array.isArray(tags)) tagsArr = tags.map(String);
    else if (typeof tags === 'string' && tags.trim() !== '') tagsArr = tags.split(',').map(t => t.trim()).filter(Boolean);
    // normalize case and remove duplicates
    tagsArr = tagsArr.map(t => t.toLowerCase()).filter(Boolean);
    tagsArr = Array.from(new Set(tagsArr));

        const newPost = await db.query(
            'INSERT INTO posts (title, content, author_id, draft, tags) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [title, content, authorId, !!draft, tagsArr]
        );
        res.status(200).json(newPost.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Publish a draft -> set draft = false
router.put('/:id/publish', protect, async (req, res) => {
    try {
        const { id } = req.params;
        const intId = parseInt(id, 10);
        if (Number.isNaN(intId)) return res.status(404).json({ message: 'Draft not found' });
        const userId = req.user.id;
        const updated = await db.query('UPDATE posts SET draft = false, updated_at = now() WHERE id = $1 AND author_id = $2 RETURNING *', [intId, userId]);
        if (updated.rows.length === 0) return res.status(404).json({ message: 'Draft not found' });
        res.json(updated.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Update a post (title, content, draft)
router.put('/:id', protect, async (req, res) => {
    try {
        const { id } = req.params;
        const intId = parseInt(id, 10);
        if (Number.isNaN(intId)) return res.status(404).json({ message: 'Post not found or not authorized' });
        const userId = req.user.id;
    const { title, content, draft, tags } = req.body;

        const fields = [];
        const params = [];
        let idx = 1;
        if (title !== undefined) { fields.push(`title = $${idx++}`); params.push(title); }
        if (content !== undefined) { fields.push(`content = $${idx++}`); params.push(content); }
        if (draft !== undefined) { fields.push(`draft = $${idx++}`); params.push(!!draft); }
        if (tags !== undefined) {
            // normalize tags
            let tagsArr = [];
            if (Array.isArray(tags)) tagsArr = tags.map(String);
            else if (typeof tags === 'string' && tags.trim() !== '') tagsArr = tags.split(',').map(t => t.trim()).filter(Boolean);
            tagsArr = tagsArr.map(t => t.toLowerCase()).filter(Boolean);
            tagsArr = Array.from(new Set(tagsArr));
            fields.push(`tags = $${idx++}`);
            params.push(tagsArr);
        }

        if (fields.length === 0) return res.status(400).json({ message: 'No fields to update' });

        params.push(intId);
        params.push(userId);
        const sql = `UPDATE posts SET ${fields.join(', ')}, updated_at = now() WHERE id = $${idx++} AND author_id = $${idx} RETURNING *`;
        const updated = await db.query(sql, params);
        if (updated.rows.length === 0) return res.status(404).json({ message: 'Post not found or not authorized' });
        res.json(updated.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;

