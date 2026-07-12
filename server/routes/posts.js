const express = require('express');
const db = require('../db/db');
const { protect, optionalProtect } = require('../middleware/authMiddleware');
const router = express.Router();
const multer = require('multer');
const { S3Client } = require('@aws-sdk/client-s3');
const multerS3 = require('multer-s3');
const path = require('path');
const generateSlug = require('../utils/slugify');

const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});

const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.AWS_S3_BUCKET_NAME,
        contentType: multerS3.AUTO_CONTENT_TYPE,
        metadata: function (req, file, cb) {
            cb(null, { fieldName: file.fieldname });
        },
        key: function (req, file, cb) {
            const folder = req.body.type || 'other';
            cb(null, `${folder}/${Date.now().toString()}${path.extname(file.originalname)}`);
        }
    })
});

router.post('/upload', protect, upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }
    const bucket = process.env.AWS_S3_BUCKET_NAME;
    const region = process.env.AWS_REGION;
    const key = req.file.key;
    const imageUrl = req.file.location || `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
    res.status(200).json({ imageUrl });
});

router.get('/', optionalProtect, async (req, res) => {
    try {
        const currentUserId = req.user ? req.user.id : null;
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
        const offset = (page - 1) * limit;

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
            WHERE p.draft = false 
            ORDER BY p.created_at DESC
            LIMIT $2 OFFSET $3
        `;
        const countResult = await db.query('SELECT COUNT(*) FROM posts WHERE draft = false');
        const total = parseInt(countResult.rows[0].count, 10);
        const result = await db.query(sql, [currentUserId, limit, offset]);
        res.json({ posts: result.rows, total, page, limit, totalPages: Math.ceil(total / limit) });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

router.get('/top', optionalProtect, async (req, res) => {
    try {
        const currentUserId = req.user ? req.user.id : null;
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
            WHERE p.draft = false 
            ORDER BY like_count DESC
            LIMIT 5
        `;
        const result = await db.query(sql, [currentUserId]);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

router.get('/search', optionalProtect, async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) {
            return res.status(400).json({ message: 'please enter something' });
        }

        const searchTerm = `%${q}%`;
        const currentUserId = req.user ? req.user.id : null;
        const { tag } = req.query;
        let sql;
        let params;

        const baseSelect = `
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
        `;

        if (tag) {
            sql = `${baseSelect} WHERE (p.title ILIKE $2 OR p.content ILIKE $2) AND p.draft = false AND p.tags @> ARRAY[$3]::text[] ORDER BY p.created_at DESC`;
            params = [currentUserId, searchTerm, tag];
        } else {
            sql = `${baseSelect} WHERE (p.title ILIKE $2 OR p.content ILIKE $2) AND p.draft = false ORDER BY p.created_at DESC`;
            params = [currentUserId, searchTerm];
        }
        const result = await db.query(sql, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

router.get('/my-drafts', protect, async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await db.query('SELECT * FROM posts WHERE user_id = $1 AND draft = true ORDER BY created_at DESC', [userId]);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

router.get('/tags/popular', async (req, res) => {
    try {
        const sql = `
            SELECT tag, COUNT(*) as count
            FROM (SELECT unnest(tags) as tag FROM posts WHERE draft = false) as unnested_tags
            GROUP BY tag
            ORDER BY count DESC
            LIMIT 10;
        `;
        const result = await db.query(sql);
        res.json(result.rows);
    } catch (err) {
        console.error('Get popular tags error:', err.message);
        res.status(500).send('Server error');
    }
});

router.get('/tag/:tag', async (req, res) => {
    try {
        const { tag } = req.params;
        const result = await db.query(
            'SELECT posts.*, users.username, users.avatar_url, users.headline FROM posts JOIN users ON posts.user_id = users.id WHERE posts.draft = false AND posts.tags @> ARRAY[$1]::text[] ORDER BY posts.created_at DESC',
            [tag]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Get posts by tag error:', err.message || err);
        res.status(500).send('Server error');
    }
});

router.get('/:idSlug', optionalProtect, async (req, res) => {
    try {
        const { idSlug } = req.params;
        const currentUserId = req.user ? req.user.id : null;

        const intId = parseInt(idSlug, 10);
        if (Number.isNaN(intId)) {
            return res.status(404).json({ message: 'Post Not Found' });
        }

        const sql = `
            SELECT 
                p.*, 
                u.username, 
                u.avatar_url,
                u.headline,
                (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) AS like_count,
                (CASE WHEN $2::INTEGER IS NOT NULL AND EXISTS (SELECT 1 FROM post_likes WHERE post_id = p.id AND user_id = $2) THEN true ELSE false END) AS user_has_liked,
                (CASE WHEN $2::INTEGER IS NOT NULL AND EXISTS (SELECT 1 FROM saved_posts WHERE post_id = p.id AND user_id = $2) THEN true ELSE false END) AS user_has_saved,
                (CASE WHEN p.user_id = $2 THEN true ELSE false END) as is_author
            FROM posts p
            JOIN users u ON p.user_id = u.id
            WHERE p.id = $1
        `;

        const result = await db.query(sql, [intId, currentUserId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Post Not Found' });
        }

        const post = result.rows[0];

        if (post.draft && post.user_id !== currentUserId) {
            return res.status(404).json({ message: 'Post Not Found' });
        }

        res.json(post);
    } catch (err) {
        console.error('Get post by ID error:', err.message);
        res.status(500).send('Server error');
    }
});

router.post('/', protect, async (req, res) => {
    try {
        const { title, content, draft, tags, cover_image_url } = req.body;
        const authorId = req.user.id;

        let tagsArr = [];
        if (Array.isArray(tags)) tagsArr = tags.map(String);
        else if (typeof tags === 'string' && tags.trim() !== '') tagsArr = tags.split(',').map(t => t.trim()).filter(Boolean);
        tagsArr = tagsArr.map(t => t.toLowerCase()).filter(Boolean);
        tagsArr = Array.from(new Set(tagsArr));

        const slug = generateSlug(title);

        const newPost = await db.query(
            'INSERT INTO posts (title, content, user_id, draft, tags, cover_image_url, slug) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [title, content, authorId, !!draft, tagsArr, cover_image_url, slug]
        );
        res.status(201).json(newPost.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

router.post('/:id/publish', protect, async (req, res) => {
    try {
        const { id } = req.params;
        const intId = parseInt(id, 10);
        if (Number.isNaN(intId)) return res.status(404).json({ message: 'Draft not found' });
        const userId = req.user.id;
        const updated = await db.query('UPDATE posts SET draft = false, updated_at = now() WHERE id = $1 AND user_id = $2 RETURNING *', [intId, userId]);
        if (updated.rows.length === 0) return res.status(404).json({ message: 'Draft not found' });
        res.json(updated.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

router.put('/:id', protect, async (req, res) => {
    try {
        const { id } = req.params;
        const intId = parseInt(id, 10);
        if (Number.isNaN(intId)) return res.status(404).json({ message: 'Post not found or not authorized' });
        const userId = req.user.id;
        const { title, content, draft, tags, cover_image_url } = req.body;

        const fields = [];
        const params = [];
        let idx = 1;
        if (title !== undefined) { 
            fields.push(`title = $${idx++}`); 
            params.push(title); 
            fields.push(`slug = $${idx++}`);
            params.push(generateSlug(title));
        }
        if (content !== undefined) { fields.push(`content = $${idx++}`); params.push(content); }
        if (draft !== undefined) { fields.push(`draft = $${idx++}`); params.push(!!draft); }
        if (cover_image_url !== undefined) { fields.push(`cover_image_url = $${idx++}`); params.push(cover_image_url); }
        if (tags !== undefined) {
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
        const sql = `UPDATE posts SET ${fields.join(', ')}, updated_at = now() WHERE id = $${idx++} AND user_id = $${idx} RETURNING *`;
        const updated = await db.query(sql, params);
        if (updated.rows.length === 0) return res.status(404).json({ message: 'Post not found or not authorized' });
        res.json(updated.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

router.delete('/:id', protect, async (req, res) => {
    try {
        const { id } = req.params;
        const intId = parseInt(id, 10);
        if (Number.isNaN(intId)) return res.status(404).json({ message: 'Post not found or not authorized' });
        const userId = req.user.id;

        const del = await db.query('DELETE FROM posts WHERE id = $1 AND user_id = $2 RETURNING id', [intId, userId]);
        if (del.rows.length === 0) return res.status(404).json({ message: 'Post not found or not authorized' });
        res.status(204).send();
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

router.post('/:id/like', protect, async (req, res) => {
    try {
        const { id } = req.params;
        const intId = parseInt(id, 10);
        if (Number.isNaN(intId)) return res.status(404).json({ message: 'Post not found' });

        const userId = req.user.id;

        const likeResult = await db.query('SELECT * FROM post_likes WHERE user_id = $1 AND post_id = $2', [userId, intId]);

        if (likeResult.rows.length > 0) {
            await db.query('DELETE FROM post_likes WHERE user_id = $1 AND post_id = $2', [userId, intId]);
            res.json({ liked: false, message: 'Post unliked' });
        } else {
            await db.query('INSERT INTO post_likes (user_id, post_id) VALUES ($1, $2)', [userId, intId]);
            res.json({ liked: true, message: 'Post liked' });
        }
    } catch (err) {
        console.error('Like/unlike post error:', err.message);
        if (err.code === '23505') {
            return res.status(409).json({ message: 'Conflict: Like status already changed.' });
        }
        res.status(500).send('Server error');
    }
});

router.post('/:id/save', protect, async (req, res) => {
    try {
        const { id } = req.params;
        const intId = parseInt(id, 10);
        if (Number.isNaN(intId)) return res.status(404).json({ message: 'Post not found' });

        const userId = req.user.id;

        const saveResult = await db.query('SELECT * FROM saved_posts WHERE user_id = $1 AND post_id = $2', [userId, intId]);

        if (saveResult.rows.length > 0) {
            await db.query('DELETE FROM saved_posts WHERE user_id = $1 AND post_id = $2', [userId, intId]);
            res.json({ saved: false, message: 'Post unsaved' });
        } else {
            await db.query('INSERT INTO saved_posts (user_id, post_id) VALUES ($1, $2)', [userId, intId]);
            res.json({ saved: true, message: 'Post saved' });
        }
    } catch (err) {
        console.error('Save/unsave post error:', err.message);
        if (err.code === '23505') {
            return res.status(409).json({ message: 'Conflict: Save status already changed.' });
        }
        res.status(500).send('Server error');
    }
});

router.get('/:id/comments', async (req, res) => {
    try {
        const { id } = req.params;
        const intId = parseInt(id, 10);
        if (Number.isNaN(intId)) return res.status(404).json({ message: 'Post not found' });

        const sql = `
            SELECT c.*, u.username, u.avatar_url
            FROM comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.post_id = $1
            ORDER BY c.created_at DESC
        `;
        const result = await db.query(sql, [intId]);
        res.json(result.rows);
    } catch (err) {
        console.error('Get comments error:', err.message);
        res.status(500).send('Server error');
    }
});

router.post('/:id/comments', protect, async (req, res) => {
    try {
        const { id } = req.params;
        const intId = parseInt(id, 10);
        if (Number.isNaN(intId)) return res.status(404).json({ message: 'Post not found' });

        const { content } = req.body;
        if (!content || !content.trim()) {
            return res.status(400).json({ message: 'Comment content is required' });
        }

        const userId = req.user.id;
        const result = await db.query(
            'INSERT INTO comments (post_id, user_id, content) VALUES ($1, $2, $3) RETURNING *',
            [intId, userId, content.trim()]
        );

        const userResult = await db.query('SELECT username, avatar_url FROM users WHERE id = $1', [userId]);
        const comment = { ...result.rows[0], ...userResult.rows[0] };

        res.status(201).json(comment);
    } catch (err) {
        console.error('Add comment error:', err.message);
        res.status(500).send('Server error');
    }
});

router.delete('/:postId/comments/:commentId', protect, async (req, res) => {
    try {
        const { postId, commentId } = req.params;
        const cId = parseInt(commentId, 10);
        const pId = parseInt(postId, 10);
        if (Number.isNaN(cId) || Number.isNaN(pId)) return res.status(404).json({ message: 'Not found' });

        const userId = req.user.id;

        // Check if user is commenter OR post author
        const checkSql = `
            SELECT c.id FROM comments c
            JOIN posts p ON c.post_id = p.id
            WHERE c.id = $1 AND (c.user_id = $2 OR p.user_id = $2)
        `;
        const check = await db.query(checkSql, [cId, userId]);

        if (check.rows.length === 0) {
            return res.status(403).json({ message: 'Unauthorized to delete this comment' });
        }

        await db.query('DELETE FROM comments WHERE id = $1', [cId]);
        res.status(204).send();
    } catch (err) {
        console.error('Delete comment error:', err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;
