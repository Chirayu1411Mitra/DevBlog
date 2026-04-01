const request = require('supertest');
const app = require('../server');
const db = require('../db/db');

jest.setTimeout(10000);

describe('Server-Level Endpoints', () => {

    // ─── GET / (Welcome route) ──────────────────────────────────────
    describe('GET /', () => {
        it('should return Welcome message', async () => {
            const res = await request(app).get('/');

            expect(res.statusCode).toBe(200);
            expect(res.text).toMatch(/welcome/i);
        });
    });

    // ─── GET /api/debug/ping ────────────────────────────────────────
    describe('GET /api/debug/ping', () => {
        it('should return ok with environment info', async () => {
            const res = await request(app).get('/api/debug/ping');

            expect(res.statusCode).toBe(200);
            expect(res.body.ok).toBe(true);
            expect(res.body).toHaveProperty('env');
        });
    });

    // ─── Compatibility shim ─────────────────────────────────────────
    describe('Compatibility shim (missing /api prefix)', () => {
        it('should rewrite /auth/* to /api/auth/*', async () => {
            const res = await request(app)
                .post('/auth/login')
                .send({ email: 'test@example.com', password: 'password' });

            // Should reach the login handler (401 = credentials wrong, not 404)
            expect([400, 401]).toContain(res.statusCode);
        });

        it('should rewrite /posts to /api/posts', async () => {
            const res = await request(app).get('/posts');

            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });
    });

    // ─── CORS ───────────────────────────────────────────────────────
    describe('CORS Headers', () => {
        it('should respond to preflight OPTIONS requests', async () => {
            const res = await request(app)
                .options('/api/posts')
                .set('Origin', 'http://localhost:5173')
                .set('Access-Control-Request-Method', 'GET');

            expect(res.statusCode).toBe(204);
        });
    });

    afterAll(async () => {
        // DB pool is shared across workers; let Jest --forceExit handle cleanup
    });
});
