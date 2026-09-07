require('dotenv').config();

const express = require('express');
const cors = require('cors');

const contactRoute = require('./routes/contact');
const ordersRoute = require('./routes/orders');
const authRoute = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 4000;
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

app.use(
    cors({
        origin: (origin, callback) => {
            // Allow requests with no origin (e.g. curl, server-to-server, Postman)
            if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
                return callback(null, true);
            }
            const err = new Error('Origin not allowed.');
            err.status = 403;
            return callback(err);
         },
    })
);

app.use(express.json({ limit: '100kb' }));

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api', authRoute);
app.use('/api', contactRoute);
app.use('/api', ordersRoute);
// Fallback error handler (e.g. CORS rejection, JSON parse errors)
app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.status || 500).json({ error: err.message || 'Something went wrong.' });
});

app.listen(PORT, () => {
    console.log(`Krint Tufwale backend running on port ${PORT}`);
});