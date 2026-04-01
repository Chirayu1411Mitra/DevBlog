const request = require('supertest');
const app = require('../server');
const db = require('../db/db');

jest.setTimeout(15000);

describe('Posts Endpoints', () => {
    const randomSuffix = Math.floor(Math.random() * 100000);
    const testUser = {
        username: `postuser_${randomSuffix}`,
        email: `postuser_${randomSuffix}@example.com`,
        password: 'password123'
    };
    let authToken = null;
    let userId = null;
    let createdPostId = null;
    let draftPostId = null;
    let commentId = null;

    // Create a test user before all tests
    beforeAll(async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send(testUser);
        authToken = res.body.token;

        const meRes = await request(app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${authToken}`);
        userId = meRes.body.user.id;
    });

    // ─── POST /api/posts (Create a post) ────────────────────────────
    describe('POST /api/posts', () => {
        it('should create a new published post', async () => {
            const res = await request(app)
                .post('/api/posts')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    title: 'Test Post Title',
                    content: 'This is test post content.',
                    tags: ['javascript', 'testing'],
                    draft: false
                });

            expect(res.statusCode).toBe(201);
            expect(res.body).toHaveProperty('id');
            expect(res.body.title).toBe('Test Post Title');
            expect(res.body.draft).toBe(false);
            expect(res.body.tags).toEqual(expect.arrayContaining(['javascript', 'testing']));
            createdPostId = res.body.id;
        });

        it('should create a draft post', async () => {
            const res = await request(app)
                .post('/api/posts')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    title: 'Draft Post',
                    content: 'This is a draft.',
                    draft: true
                });

            expect(res.statusCode).toBe(201);
            expect(res.body.draft).toBe(true);
            draftPostId = res.body.id;
        });

        it('should accept tags as comma-separated string', async () => {
            const res = await request(app)
                .post('/api/posts')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    title: 'Tag Test Post',
                    content: 'Testing tags.',
                    tags: 'react, node, express',
                    draft: false
                });

            expect(res.statusCode).toBe(201);
            expect(res.body.tags).toEqual(expect.arrayContaining(['react', 'node', 'express']));
            // Clean up this extra post
            await request(app)
                .delete(`/api/posts/${res.body.id}`)
                .set('Authorization', `Bearer ${authToken}`);
        });

        it('should reject without auth token', async () => {
            const res = await request(app)
                .post('/api/posts')
                .send({ title: 'No Auth', content: 'Should fail' });

            expect(res.statusCode).toBe(401);
        });
    });

    // ─── GET /api/posts (Get all posts) ─────────────────────────────
    describe('GET /api/posts', () => {
        it('should return an array of published posts', async () => {
            const res = await request(app).get('/api/posts');

            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });

        it('should include like_count and username fields', async () => {
            const res = await request(app).get('/api/posts');

            expect(res.statusCode).toBe(200);
            if (res.body.length > 0) {
                expect(res.body[0]).toHaveProperty('like_count');
                expect(res.body[0]).toHaveProperty('username');
            }
        });

        it('should include user_has_liked when authenticated', async () => {
            const res = await request(app)
                .get('/api/posts')
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.statusCode).toBe(200);
            if (res.body.length > 0) {
                expect(res.body[0]).toHaveProperty('user_has_liked');
                expect(res.body[0]).toHaveProperty('user_has_saved');
            }
        });
    });

    // ─── GET /api/posts/top ─────────────────────────────────────────
    describe('GET /api/posts/top', () => {
        it('should return up to 5 top liked posts', async () => {
            const res = await request(app).get('/api/posts/top');

            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeLessThanOrEqual(5);
        });
    });

    // ─── GET /api/posts/search ──────────────────────────────────────
    describe('GET /api/posts/search', () => {
        it('should return matching posts for a search query', async () => {
            const res = await request(app)
                .get('/api/posts/search')
                .query({ q: 'Test Post' });

            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });

        it('should return 400 when query is missing', async () => {
            const res = await request(app).get('/api/posts/search');
            expect(res.statusCode).toBe(400);
        });

        it('should support filtering by tag', async () => {
            const res = await request(app)
                .get('/api/posts/search')
                .query({ q: 'Test', tag: 'javascript' });

            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });
    });

    // ─── GET /api/posts/my-drafts ───────────────────────────────────
    describe('GET /api/posts/my-drafts', () => {
        it('should return drafts for authenticated user', async () => {
            const res = await request(app)
                .get('/api/posts/my-drafts')
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            // Should contain our draft
            const ids = res.body.map(p => p.id);
            expect(ids).toContain(draftPostId);
        });

        it('should reject without auth', async () => {
            const res = await request(app).get('/api/posts/my-drafts');
            expect(res.statusCode).toBe(401);
        });
    });

    // ─── GET /api/posts/tags/popular ────────────────────────────────
    describe('GET /api/posts/tags/popular', () => {
        it('should return an array of popular tags', async () => {
            const res = await request(app).get('/api/posts/tags/popular');

            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            if (res.body.length > 0) {
                expect(res.body[0]).toHaveProperty('tag');
                expect(res.body[0]).toHaveProperty('count');
            }
        });
    });

    // ─── GET /api/posts/tag/:tag ────────────────────────────────────
    describe('GET /api/posts/tag/:tag', () => {
        it('should return posts matching a tag', async () => {
            const res = await request(app).get('/api/posts/tag/javascript');

            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });

        it('should return empty array for non-existent tag', async () => {
            const res = await request(app).get('/api/posts/tag/nonexistenttag12345');

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual([]);
        });
    });

    // ─── GET /api/posts/:id ─────────────────────────────────────────
    describe('GET /api/posts/:id', () => {
        it('should return a specific post by id', async () => {
            const res = await request(app).get(`/api/posts/${createdPostId}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.id).toBe(createdPostId);
            expect(res.body.title).toBe('Test Post Title');
        });

        it('should return 404 for non-existent post', async () => {
            const res = await request(app).get('/api/posts/999999');
            expect(res.statusCode).toBe(404);
        });

        it('should return 404 for non-numeric id', async () => {
            const res = await request(app).get('/api/posts/abc');
            expect(res.statusCode).toBe(404);
        });

        it('should not expose drafts to non-authors', async () => {
            // Request draft without auth
            const res = await request(app).get(`/api/posts/${draftPostId}`);
            expect(res.statusCode).toBe(404);
        });

        it('should expose drafts to the author', async () => {
            const res = await request(app)
                .get(`/api/posts/${draftPostId}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.draft).toBe(true);
        });
    });

    // ─── PUT /api/posts/:id (Update) ────────────────────────────────
    describe('PUT /api/posts/:id', () => {
        it('should update the post title', async () => {
            const res = await request(app)
                .put(`/api/posts/${createdPostId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ title: 'Updated Title' });

            expect(res.statusCode).toBe(200);
            expect(res.body.title).toBe('Updated Title');
        });

        it('should update post content and tags together', async () => {
            const res = await request(app)
                .put(`/api/posts/${createdPostId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ content: 'Updated content.', tags: ['updated'] });

            expect(res.statusCode).toBe(200);
            expect(res.body.content).toBe('Updated content.');
            expect(res.body.tags).toContain('updated');
        });

        it('should reject update with no fields', async () => {
            const res = await request(app)
                .put(`/api/posts/${createdPostId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({});

            expect(res.statusCode).toBe(400);
        });

        it('should reject update without auth', async () => {
            const res = await request(app)
                .put(`/api/posts/${createdPostId}`)
                .send({ title: 'Hacked' });

            expect(res.statusCode).toBe(401);
        });

        it('should return 404 for non-existent post', async () => {
            const res = await request(app)
                .put('/api/posts/999999')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ title: 'Ghost' });

            expect(res.statusCode).toBe(404);
        });
    });

    // ─── POST /api/posts/:id/publish ────────────────────────────────
    describe('POST /api/posts/:id/publish', () => {
        it('should publish a draft', async () => {
            const res = await request(app)
                .post(`/api/posts/${draftPostId}/publish`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.draft).toBe(false);
        });

        it('should reject without auth', async () => {
            const res = await request(app)
                .post(`/api/posts/${draftPostId}/publish`);

            expect(res.statusCode).toBe(401);
        });

        it('should return 404 for non-existent draft', async () => {
            const res = await request(app)
                .post('/api/posts/999999/publish')
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.statusCode).toBe(404);
        });
    });

    // ─── POST /api/posts/:id/like ───────────────────────────────────
    describe('POST /api/posts/:id/like', () => {
        it('should like a post', async () => {
            const res = await request(app)
                .post(`/api/posts/${createdPostId}/like`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.liked).toBe(true);
        });

        it('should unlike a previously liked post', async () => {
            const res = await request(app)
                .post(`/api/posts/${createdPostId}/like`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.liked).toBe(false);
        });

        it('should reject without auth', async () => {
            const res = await request(app)
                .post(`/api/posts/${createdPostId}/like`);

            expect(res.statusCode).toBe(401);
        });
    });

    // ─── POST /api/posts/:id/save ───────────────────────────────────
    describe('POST /api/posts/:id/save', () => {
        it('should save a post', async () => {
            const res = await request(app)
                .post(`/api/posts/${createdPostId}/save`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.saved).toBe(true);
        });

        it('should unsave a previously saved post', async () => {
            const res = await request(app)
                .post(`/api/posts/${createdPostId}/save`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.saved).toBe(false);
        });

        it('should reject without auth', async () => {
            const res = await request(app)
                .post(`/api/posts/${createdPostId}/save`);

            expect(res.statusCode).toBe(401);
        });
    });

    // ─── GET /api/posts/:id/comments ────────────────────────────────
    describe('GET /api/posts/:id/comments', () => {
        it('should return an empty array for a post with no comments', async () => {
            const res = await request(app)
                .get(`/api/posts/${createdPostId}/comments`);

            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });
    });

    // ─── POST /api/posts/:id/comments ───────────────────────────────
    describe('POST /api/posts/:id/comments', () => {
        it('should add a comment to a post', async () => {
            const res = await request(app)
                .post(`/api/posts/${createdPostId}/comments`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ content: 'Great post!' });

            expect(res.statusCode).toBe(201);
            expect(res.body.content).toBe('Great post!');
            expect(res.body).toHaveProperty('username');
            commentId = res.body.id;
        });

        it('should reject empty comment content', async () => {
            const res = await request(app)
                .post(`/api/posts/${createdPostId}/comments`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ content: '' });

            expect(res.statusCode).toBe(400);
        });

        it('should reject without auth', async () => {
            const res = await request(app)
                .post(`/api/posts/${createdPostId}/comments`)
                .send({ content: 'Anonymous comment' });

            expect(res.statusCode).toBe(401);
        });

        it('should return comments after adding one', async () => {
            const res = await request(app)
                .get(`/api/posts/${createdPostId}/comments`);

            expect(res.statusCode).toBe(200);
            expect(res.body.length).toBeGreaterThanOrEqual(1);
            expect(res.body[0]).toHaveProperty('username');
        });
    });

    // ─── DELETE /api/posts/:postId/comments/:commentId ──────────────
    describe('DELETE /api/posts/:postId/comments/:commentId', () => {
        it('should delete own comment', async () => {
            const res = await request(app)
                .delete(`/api/posts/${createdPostId}/comments/${commentId}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.statusCode).toBe(204);
        });

        it('should return 404 for already deleted comment', async () => {
            const res = await request(app)
                .delete(`/api/posts/${createdPostId}/comments/${commentId}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.statusCode).toBe(404);
        });

        it('should reject without auth', async () => {
            const res = await request(app)
                .delete(`/api/posts/${createdPostId}/comments/1`);

            expect(res.statusCode).toBe(401);
        });
    });

    // ─── DELETE /api/posts/:id ──────────────────────────────────────
    describe('DELETE /api/posts/:id', () => {
        it('should reject without auth', async () => {
            const res = await request(app)
                .delete(`/api/posts/${createdPostId}`);

            expect(res.statusCode).toBe(401);
        });

        it('should delete own post', async () => {
            const res = await request(app)
                .delete(`/api/posts/${createdPostId}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.statusCode).toBe(204);
        });

        it('should delete the draft post too', async () => {
            const res = await request(app)
                .delete(`/api/posts/${draftPostId}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.statusCode).toBe(204);
        });

        it('should return 404 for already-deleted post', async () => {
            const res = await request(app)
                .delete(`/api/posts/${createdPostId}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.statusCode).toBe(404);
        });
    });

    // ─── POST /api/posts/upload (file upload) ───────────────────────
    describe('POST /api/posts/upload', () => {
        it('should reject without a file', async () => {
            const res = await request(app)
                .post('/api/posts/upload')
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.statusCode).toBe(400);
        });

        it('should reject without auth', async () => {
            const res = await request(app)
                .post('/api/posts/upload');

            expect(res.statusCode).toBe(401);
        });
    });

    // ─── Cleanup ────────────────────────────────────────────────────
    afterAll(async () => {
        try {
            await db.query('DELETE FROM users WHERE username = $1', [testUser.username]);
        } catch (_) { /* ignore */ }
    });
});
