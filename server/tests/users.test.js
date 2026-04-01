const request = require('supertest');
const app = require('../server');
const db = require('../db/db');

jest.setTimeout(15000);

describe('Users Endpoints', () => {
    const randomSuffix = Math.floor(Math.random() * 100000);
    const userA = {
        username: `usera_${randomSuffix}`,
        email: `usera_${randomSuffix}@example.com`,
        password: 'password123'
    };
    const userB = {
        username: `userb_${randomSuffix}`,
        email: `userb_${randomSuffix}@example.com`,
        password: 'password123'
    };
    let tokenA = null;
    let tokenB = null;
    let userAId = null;
    let userBId = null;


    beforeAll(async () => {
        const resA = await request(app).post('/api/auth/register').send(userA);
        tokenA = resA.body.token;
        const meA = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${tokenA}`);
        userAId = meA.body.user.id;

        const resB = await request(app).post('/api/auth/register').send(userB);
        tokenB = resB.body.token;
        const meB = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${tokenB}`);
        userBId = meB.body.user.id;
    });

    describe('GET /api/users/:username', () => {
        it('should return a public user profile with posts', async () => {
            const res = await request(app).get(`/api/users/${userA.username}`);

            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('user');
            expect(res.body).toHaveProperty('posts');
            expect(res.body.user.username).toBe(userA.username);
            expect(res.body.user).toHaveProperty('followers_count');
            expect(res.body.user).toHaveProperty('following_count');
        });

        it('should include is_following when authenticated', async () => {
            const res = await request(app)
                .get(`/api/users/${userB.username}`)
                .set('Authorization', `Bearer ${tokenA}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.user).toHaveProperty('is_following');
        });

        it('should return 404 for non-existent user', async () => {
            const res = await request(app).get('/api/users/nonexistentuser12345');

            expect(res.statusCode).toBe(404);
        });
    });

    // ─── POST /api/users/:id/follow ─────────────────────────────────
    describe('POST /api/users/:id/follow', () => {
        it('should follow another user', async () => {
            const res = await request(app)
                .post(`/api/users/${userBId}/follow`)
                .set('Authorization', `Bearer ${tokenA}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.following).toBe(true);
        });

        it('should prevent following yourself', async () => {
            const res = await request(app)
                .post(`/api/users/${userAId}/follow`)
                .set('Authorization', `Bearer ${tokenA}`);

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toMatch(/cannot follow yourself/i);
        });

        it('should unfollow a previously followed user', async () => {
            const res = await request(app)
                .post(`/api/users/${userBId}/follow`)
                .set('Authorization', `Bearer ${tokenA}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.following).toBe(false);
        });

        it('should reject without auth', async () => {
            const res = await request(app)
                .post(`/api/users/${userBId}/follow`);

            expect(res.statusCode).toBe(401);
        });

        // Re-follow for subsequent tests
        it('should re-follow for subsequent tests', async () => {
            const res = await request(app)
                .post(`/api/users/${userBId}/follow`)
                .set('Authorization', `Bearer ${tokenA}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.following).toBe(true);
        });
    });

    // ─── GET /api/users/:id/followers ───────────────────────────────
    describe('GET /api/users/:id/followers', () => {
        it('should return the followers of a user', async () => {
            const res = await request(app).get(`/api/users/${userBId}/followers`);

            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            // userA is following userB
            const followerIds = res.body.map(u => u.id);
            expect(followerIds).toContain(userAId);
        });

        it('should return 404 for non-numeric id', async () => {
            const res = await request(app).get('/api/users/abc/followers');
            expect(res.statusCode).toBe(404);
        });
    });

    // ─── GET /api/users/:id/following ───────────────────────────────
    describe('GET /api/users/:id/following', () => {
        it('should return users that a user is following', async () => {
            const res = await request(app).get(`/api/users/${userAId}/following`);

            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            // userA is following userB
            const followingIds = res.body.map(u => u.id);
            expect(followingIds).toContain(userBId);
        });

        it('should return 404 for non-numeric id', async () => {
            const res = await request(app).get('/api/users/abc/following');
            expect(res.statusCode).toBe(404);
        });
    });

    // ─── DELETE /api/users/followers/:id ─────────────────────────────
    describe('DELETE /api/users/followers/:id', () => {
        it('should remove a follower (userB removes userA as follower)', async () => {
            const res = await request(app)
                .delete(`/api/users/followers/${userAId}`)
                .set('Authorization', `Bearer ${tokenB}`);

            expect(res.statusCode).toBe(200);
            expect(res.body.message).toMatch(/follower removed/i);
        });

        it('should confirm follower was removed', async () => {
            const res = await request(app).get(`/api/users/${userBId}/followers`);

            expect(res.statusCode).toBe(200);
            const followerIds = res.body.map(u => u.id);
            expect(followerIds).not.toContain(userAId);
        });

        it('should reject without auth', async () => {
            const res = await request(app)
                .delete(`/api/users/followers/${userAId}`);

            expect(res.statusCode).toBe(401);
        });
    });

    // ─── Cleanup ────────────────────────────────────────────────────
    afterAll(async () => {
        try {
            await db.query('DELETE FROM users WHERE username IN ($1, $2)', [userA.username, userB.username]);
        } catch (_) { /* ignore */ }
    });
});
