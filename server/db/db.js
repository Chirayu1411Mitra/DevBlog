const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
	console.error('DATABASE_URL is not set in .env. The server requires a PostgreSQL connection string.');
	// Exit early so the app doesn't run without a DB configured
	process.exit(1);
}

const pool = new Pool({
	connectionString,
	ssl: process.env.NODE_ENV === 'production' ? true : false
});

// Test connection strictly but don't kill the process immediately in serverless
// Serverless environments might have cold starts or transient network issues
pool.connect().then(client => {
	client.release();
	console.log('Postgres connection established');
}).catch(err => {
	console.error('Database connection warning:', err.message);
});

// Run lightweight migrations: ensure expected columns/tables exist
(async () => {
	try {
		// Add draft column to posts if missing
		await pool.query("ALTER TABLE posts ADD COLUMN IF NOT EXISTS draft BOOLEAN DEFAULT FALSE;");
		// Add tags column (text array) if missing
		await pool.query("ALTER TABLE posts ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';");
		// Add cover_image_url column if missing
		await pool.query("ALTER TABLE posts ADD COLUMN IF NOT EXISTS cover_image_url VARCHAR(255);");

		// Ensure join tables exist
		await pool.query(`CREATE TABLE IF NOT EXISTS post_likes (
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, post_id)
        );`);
		await pool.query(`CREATE TABLE IF NOT EXISTS saved_posts (
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, post_id)
        );`);
		await pool.query(`CREATE TABLE IF NOT EXISTS user_follows (
            follower_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            following_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (follower_id, following_id)
        );`);
		await pool.query(`CREATE TABLE IF NOT EXISTS comments (
            id SERIAL PRIMARY KEY,
            post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            content TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );`);

	} catch (mErr) {
		console.error('Database migration warning:', mErr.message || mErr);
	}
})();

module.exports = {
	query: (text, params) => pool.query(text, params),
	pool,
};
