const GitHubStrategy = require('passport-github2').Strategy;
const db = require('../db/db');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

module.exports = function (passport) {
        const callbackURL = process.env.SERVER_URL
            ? `${process.env.SERVER_URL}/api/auth/github/callback`
            : `http://localhost:${process.env.PORT || 6969}/api/auth/github/callback`;

        // Helpful runtime logging for debugging OAuth issues
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
            },
            async (accessToken, refreshToken, profile, done) => {
                try {
                    const { id, username, photos } = profile;
                    const avatar_url = Array.isArray(photos) && photos.length ? photos[0].value : null;

                    const userResult = await db.query('SELECT * FROM users WHERE github_id = $1', [id]);
                    let user = userResult.rows[0];

                    if (user) {
                        await db.query('UPDATE users SET github_access_token = $1 WHERE github_id = $2', [accessToken, id]);
                        return done(null, user);
                    }

                    const newUserResult = await db.query(
                        'INSERT INTO users (username, github_id, avatar_url, github_access_token) VALUES($1,$2,$3,$4) RETURNING *',
                        [username, id, avatar_url, accessToken]
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