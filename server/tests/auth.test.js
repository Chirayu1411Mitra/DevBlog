const request = require('supertest');
const app = require('../server');
const db = require('../db/db');

jest.setTimeout(15000);

describe('Auth Endpoints', () => {
    const randomSuffix = Math.floor(Math.random() * 100000);
    const testUser = {
        username: `testuser_${randomSuffix}`,
        email: `testuser_${randomSuffix}@example.com`,
        password: 'password123'
    };
    let authToken = null;

    // ─── POST /api/auth/register ────────────────────────────────────
    describe('POST /api/auth/register', () => {
        it('should register a new user and return a token', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send(testUser);

            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('token');
            authToken = res.body.token;
        });

        it('should reject registration with missing fields', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({ username: 'incomplete' });

            expect(res.statusCode).toBe(400);
            expect(res.body).toHaveProperty('message');
        });

        it('should reject duplicate email/username', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send(testUser);

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toMatch(/already exists/i);
        });
    });

    // ─── POST /api/auth/login ───────────────────────────────────────
    describe('POST /api/auth/login', () => {
        it('should login with valid credentials', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: testUser.email, password: testUser.password });

            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('token');
            authToken = res.body.token; // refresh token
        });

        it('should reject login with wrong password', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: testUser.email, password: 'wrongpassword' });

            expect(res.statusCode).toBe(401);
        });

        it('should reject login with missing fields', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({});

            expect(res.statusCode).toBe(400);
        });

        it('should reject login for non-existent user', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: 'nonexistent@example.com', password: 'password' });

            expect(res.statusCode).toBe(401);
        });
    });

    // ─── GET /api/auth/me ───────────────────────────────────────────
    describe('GET /api/auth/me', () => {
        it('should return the authenticated user profile', async () => {
            const res = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('user');
            expect(res.body.user.username).toBe(testUser.username);
            expect(res.body.user.email).toBe(testUser.email);
        });

        it('should reject without token', async () => {
            const res = await request(app).get('/api/auth/me');
            expect(res.statusCode).toBe(401);
        });

        it('should reject with invalid token', async () => {
            const res = await request(app)
                .get('/api/auth/me')
                .set('Authorization', 'Bearer invalidtoken123');

            expect(res.statusCode).toBe(401);
        });
    });

    // ─── PUT /api/auth/me ───────────────────────────────────────────
    describe('PUT /api/auth/me', () => {
        it('should update the user bio', async () => {
            // Note: endpoint requires username, email, or password alongside bio
            const res = await request(app)
                .put('/api/auth/me')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ username: testUser.username, bio: 'Test bio content' });

            expect(res.statusCode).toBe(200);
            expect(res.body.user.bio).toBe('Test bio content');
        });

        it('should reject update with no fields', async () => {
            const res = await request(app)
                .put('/api/auth/me')
                .set('Authorization', `Bearer ${authToken}`)
                .send({});

            expect(res.statusCode).toBe(400);
        });

        it('should reject password change without currentPassword', async () => {
            const res = await request(app)
                .put('/api/auth/me')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ password: 'newpassword456' });

            expect(res.statusCode).toBe(400);
        });

        it('should reject password change with wrong currentPassword', async () => {
            const res = await request(app)
                .put('/api/auth/me')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ password: 'newpassword456', currentPassword: 'wrongpassword' });

            expect(res.statusCode).toBe(401);
        });

        it('should reject update without token', async () => {
            const res = await request(app)
                .put('/api/auth/me')
                .send({ bio: 'Hacked bio' });

            expect(res.statusCode).toBe(401);
        });
    });

    // ─── GET /api/auth/my-posts ─────────────────────────────────────
    describe('GET /api/auth/my-posts', () => {
        it('should return posts for authenticated user', async () => {
            const res = await request(app)
                .get('/api/auth/my-posts')
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });

        it('should reject without token', async () => {
            const res = await request(app).get('/api/auth/my-posts');
            expect(res.statusCode).toBe(401);
        });
    });

    // ─── GET /api/auth/me/saved-posts ───────────────────────────────
    describe('GET /api/auth/me/saved-posts', () => {
        it('should return saved posts for authenticated user', async () => {
            const res = await request(app)
                .get('/api/auth/me/saved-posts')
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });

        it('should reject without token', async () => {
            const res = await request(app).get('/api/auth/me/saved-posts');
            expect(res.statusCode).toBe(401);
        });
    });

    // ─── POST /api/auth/verify-password ─────────────────────────────
    describe('POST /api/auth/verify-password', () => {
        it('should confirm correct password', async () => {
            const res = await request(app)
                .post('/api/auth/verify-password')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ currentPassword: testUser.password });

            expect(res.statusCode).toBe(200);
            expect(res.body.ok).toBe(true);
        });

        it('should reject wrong password', async () => {
            const res = await request(app)
                .post('/api/auth/verify-password')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ currentPassword: 'wrongpassword' });

            expect(res.statusCode).toBe(401);
        });

        it('should reject missing currentPassword', async () => {
            const res = await request(app)
                .post('/api/auth/verify-password')
                .set('Authorization', `Bearer ${authToken}`)
                .send({});

            expect(res.statusCode).toBe(400);
        });
    });

    // ─── POST /api/auth/forgot ──────────────────────────────────────
    describe('POST /api/auth/forgot', () => {
        it('should accept a valid email (always returns 200 for security)', async () => {
            const res = await request(app)
                .post('/api/auth/forgot')
                .send({ email: testUser.email });

            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('message');
        });

        it('should accept a non-existent email (no information leak)', async () => {
            const res = await request(app)
                .post('/api/auth/forgot')
                .send({ email: 'nonexistent@example.com' });

            expect(res.statusCode).toBe(200);
        });

        it('should reject missing email', async () => {
            const res = await request(app)
                .post('/api/auth/forgot')
                .send({});

            expect(res.statusCode).toBe(400);
        });
    });

    // ─── GET /api/auth/reset/:token ─────────────────────────────────
    describe('GET /api/auth/reset/:token', () => {
        it('should return 404 for invalid token', async () => {
            const res = await request(app)
                .get('/api/auth/reset/invalidtoken123');

            expect(res.statusCode).toBe(404);
        });
    });

    // ─── POST /api/auth/reset/:token ────────────────────────────────
    describe('POST /api/auth/reset/:token', () => {
        it('should return 404 for invalid token', async () => {
            const res = await request(app)
                .post('/api/auth/reset/invalidtoken123')
                .send({ password: 'newpassword' });

            expect(res.statusCode).toBe(404);
        });

        it('should reject missing password', async () => {
            const res = await request(app)
                .post('/api/auth/reset/invalidtoken123')
                .send({});

            // Token lookup happens first, so 404 is expected
            expect([400, 404]).toContain(res.statusCode);
        });
    });

    // ─── Cleanup ────────────────────────────────────────────────────
    afterAll(async () => {
        // Remove test user
        try {
            await db.query('DELETE FROM users WHERE username = $1', [testUser.username]);
        } catch (_) { /* ignore */ }
    });
});
