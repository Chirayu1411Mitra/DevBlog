const db = require('./db/db');
require('dotenv').config();

const addColumns = async () => {
    try {
        await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;`);
        await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS banner_url VARCHAR(255);`);
        console.log('Successfully added bio and banner_url columns.');
        process.exit(0);
    } catch (err) {
        console.error('Error adding columns:', err);
        process.exit(1);
    }
};

addColumns();
