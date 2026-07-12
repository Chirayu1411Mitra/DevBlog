const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
    try {
        let envConfig = dotenv.parse(fs.readFileSync(envPath));
        if (!envConfig.DATABASE_URL) {
            const envContent = fs.readFileSync(envPath, 'utf16le');
            envConfig = dotenv.parse(envContent);
        }
        for (const k in envConfig) {
            process.env[k] = envConfig[k];
        }
    } catch (e) {
        console.error(e);
    }
}

const db = require('../db/db');
const generateSlug = require('../utils/slugify');

async function backfillSlugs() {
    try {
        console.log('Starting slug backfill...');
        // get all posts without a slug or even with one to ensure correctness
        const res = await db.query('SELECT id, title FROM posts WHERE slug IS NULL');
        console.log(`Found ${res.rows.length} posts needing a slug.`);

        for (const post of res.rows) {
            const slug = generateSlug(post.title);
            await db.query('UPDATE posts SET slug = $1 WHERE id = $2', [slug, post.id]);
            console.log(`Updated post ID ${post.id} with slug: ${slug}`);
        }

        console.log('Backfill complete!');
    } catch (err) {
        console.error('Error during backfill:', err);
    } finally {
        process.exit(0);
    }
}

backfillSlugs();
