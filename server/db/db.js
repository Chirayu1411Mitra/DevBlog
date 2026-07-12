const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
	console.error('DATABASE_URL is not set in .env. The server requires a PostgreSQL connection string.');
	process.exit(1);
}

const requiresSsl = connectionString.includes('sslmode=require') || process.env.NODE_ENV === 'production';

const pool = new Pool({
	connectionString,
	ssl: requiresSsl ? { rejectUnauthorized: false } : false
});

pool.connect().then(client => {
	client.release();
	console.log('Postgres connection established');
}).catch(err => {
	console.error('Database connection warning:', err.message);
});

(async () => {
	try {
		await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS headline VARCHAR(255);");
		await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS github_id VARCHAR(255) UNIQUE;");
		await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS github_access_token TEXT;");
		await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(255);");
		await pool.query("ALTER TABLE posts ADD COLUMN IF NOT EXISTS draft BOOLEAN DEFAULT FALSE;");
		await pool.query("ALTER TABLE posts ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';");
		await pool.query("ALTER TABLE posts ADD COLUMN IF NOT EXISTS cover_image_url VARCHAR(255);");
		await pool.query("ALTER TABLE posts ADD COLUMN IF NOT EXISTS slug VARCHAR(255);");
		await pool.query("ALTER TABLE posts ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;");
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
