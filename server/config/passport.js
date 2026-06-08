const GitHubStrategy = require('passport-github2').Strategy;
const db = require('../db/db');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

module.exports = function (passport) {
    let serverUrl = process.env.SERVER_URL || 'http://localhost:6969';
    // Remove trailing slash if present
    if (serverUrl.endsWith('/')) {
        serverUrl = serverUrl.slice(0, -1);
    }
    const callbackURL = `${serverUrl}/api/auth/github/callback`;

    console.log('Passport GitHub callback URL:', callbackURL);
    if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
        console.warn('GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET is not set. GitHub OAuth will fail.');
    }

    passport.use(
        new GitHubStrategy(
            {
                clientID: process.env.GITHUB_CLIENT_ID,
                clientSecret: process.env.GITHUB_CLIENT_SECRET,
                callbackURL,
                proxy: true,
            },
            async (accessToken, refreshToken, profile, done) => {
                try {
                    const { id, username, photos } = profile;
                    const avatar_url = Array.isArray(photos) && photos.length ? photos[0].value : null;
                    const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;

                    const userResult = await db.query('SELECT * FROM users WHERE github_id = $1', [id]);
                    let user = userResult.rows[0];

                    if (user) {
                        await db.query('UPDATE users SET github_access_token = $1, avatar_url = $2 WHERE github_id = $3', [accessToken, avatar_url, id]);
                        return done(null, user);
                    }

                    if (email) {
                        const existingEmail = await db.query('SELECT * FROM users WHERE email = $1', [email]);
                        if (existingEmail.rows.length > 0) {
                            const existingUser = existingEmail.rows[0];
                            await db.query('UPDATE users SET github_id = $1, github_access_token = $2, avatar_url = $3 WHERE id = $4', [id, accessToken, avatar_url, existingUser.id]);
                            return done(null, existingUser);
                        }
                    }

                    const newUserResult = await db.query(
                        'INSERT INTO users (username, email, github_id, avatar_url, github_access_token) VALUES($1, $2, $3, $4, $5) ON CONFLICT (username) DO UPDATE SET github_id = EXCLUDED.github_id, avatar_url = EXCLUDED.avatar_url, github_access_token = EXCLUDED.github_access_token RETURNING *',
                        [username, email, id, avatar_url, accessToken]
                    );

                    user = newUserResult.rows[0];
                    return done(null, user);
                } catch (err) {
                    console.error('Passport GitHub error:', err);
                    return done(err, null);
                }
            }
        )
    );
};