const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });


const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    console.error('DATABASE_URL is not set in .env. The server requires a PostgreSQL connection string.');
    process.exit(1);
}

const poolConfig = {
    connectionString,
    ssl: {
        rejectUnauthorized: false
    }
};


// Define and create the pool ONCE
const pool = new Pool(poolConfig);


// Test connection immediately
(async () => {
    try {
        const client = await pool.connect();
        client.release();
        console.log('Postgres connection established');
        // Migration logic can go here...
    } catch (err) {
        console.error('Unable to connect to Postgres. Please ensure the database exists and DATABASE_URL is correct.');
        console.error(err.message || err);
        process.exit(1);
    }
})();

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool,
};
