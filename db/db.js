const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
	console.error('DATABASE_URL is not set in .env. The server requires a PostgreSQL connection string.');
	// Exit early so the app doesn't run without a DB configured
	process.exit(1);
}

const pool = new Pool({ connectionString });

// Test connection immediately so failures are noisy and actionable at startup.
(async () => {
	try {
		const client = await pool.connect();
		client.release();
		console.log('Postgres connection established');
		// Run lightweight migrations: ensure expected columns/tables exist
		try {
			// Add draft column to posts if missing
			await pool.query("ALTER TABLE posts ADD COLUMN IF NOT EXISTS draft BOOLEAN DEFAULT FALSE;");
				// Add tags column (text array) if missing
				await pool.query("ALTER TABLE posts ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';");
		} catch (mErr) {
			// Log migration errors but don't crash the server here; surface them for debugging
			console.error('Database migration warning:', mErr.message || mErr);
		}
	} catch (err) {
		console.error('Unable to connect to Postgres. Please ensure the database exists and DATABASE_URL is correct.');
		console.error(err.message || err);
		// Exit so the rest of the app doesn't run in a broken state.
		process.exit(1);
	}
})();

module.exports = {
	query: (text, params) => pool.query(text, params),
	pool,
};
