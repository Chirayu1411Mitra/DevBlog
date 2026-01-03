const request = require('supertest');
const app = require('../server'); // Assuming server.js exports app. If not, we might need to refactor.
const db = require('../db/db');

// Increase timeout for DB connections
jest.setTimeout(10000);

describe('Auth Endpoints', () => {
    // Generate a random username to avoid conflicts
    const randomUser = `testuser_${Math.floor(Math.random() * 10000)}`;
    const testUser = {
        username: randomUser,
        email: `${randomUser}@example.com`,
        password: 'password123'
    };

    // Clean up before/after if needed, but for now we just create new users
    // Note: In a real env, we should truncate tables or use a test DB.

    it('should register a new user', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send(testUser);

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('token');
        // Register endpoint only returns token, not user object
    });

    it('should login the registered user', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: testUser.email,
                password: testUser.password
            });

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('token');
    });

    it('should fail login with wrong password', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: testUser.email,
                password: 'wrongpassword'
            });

        expect(res.statusCode).toEqual(401); // Or 400 depending on implementation
    });
});

// Close DB connection after tests if the server file keeps it open
// This depends on how server.js is structured. 
// If server.js starts listening immediately, supertest might grab the listener, but DB pool might hang.
afterAll(async () => {
    // Explicitly close DB pool if possible
    await db.pool.end();
});
