const express = require('express');
const cors= require('cors');
const passport= require('passport');
const path = require('path');
// Load .env from the server folder (use __dirname so dotenv finds server/.env
require('dotenv').config({ path: path.join(__dirname, '.env') });
console.log('DATABASE_URL loaded:', process.env.DATABASE_URL);
const app = express();

require('./config/passport')(passport);
app.use(passport.initialize());
app.use(cors({origin: process.env.CLIENT_URL}));
app.use(express.json());
app.use(express.urlencoded({extended: false}));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/posts', require('./routes/posts'));

// Dev/debug endpoints
app.get('/api/debug/ping', (req, res) => {
    res.json({ ok: true, env: process.env.NODE_ENV || 'development' });
});

app.get('/api/debug/smtp-test', async (req, res) => {
    // send a small test email using the current SMTP settings
    const nodemailer = require('nodemailer');
    try {
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: Number(process.env.SMTP_PORT) || 465,
            secure: process.env.SMTP_SECURE === 'false' ? false : true,
            auth: {
                user: process.env.SMTP_USER || process.env.EMAIL_USER,
                pass: process.env.SMTP_PASS || process.env.EMAIL_PASS
            }
        });

        const info = await transporter.sendMail({
            from: process.env.FROM_EMAIL || process.env.SMTP_USER,
            to: process.env.SMTP_USER,
            subject: 'DevBlog SMTP test',
            text: 'This is a test message from DevBlog.'
        });
        res.json({ ok: true, info: info && info.response });
    } catch (err) {
        console.error('SMTP test error:', err);
        res.status(500).json({ ok: false, error: err.message || String(err) });
    }
});

app.get('/', (rew, res)=>{
    res.send("Welcome")
});

const PORT = process.env.PORT || 6969;

app.listen(PORT, ()=> console.log( `Server running on port ${PORT}`));
