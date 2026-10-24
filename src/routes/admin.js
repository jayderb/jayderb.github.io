const crypto = require('crypto');
const express = require('express');
const rateLimit = require('express-rate-limit');
const { signAdminToken } = require('../auth');
const { requireAdmin } = require('../middleware/requireAdmin');
const { listOrders, updateOrderStatus } = require('../db/database');

const router = express.Router();

const STATUSES = ['pending', 'confirmed', 'paid', 'delivered', 'cancelled'];

// Only failed attempts count, so signing in normally never burns your allowance
const adminLoginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    skipSuccessfulRequests: true,
    message: { error: 'Too many attempts. Try again in 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Hash both sides first so timingSafeEqual gets equal-length buffers
function passwordMatches(candidate) {
    const expected = process.env.ADMIN_PASSWORD;
    if (!expected) return false;
    const a = crypto.createHash('sha256').update(String(candidate || '')).digest();
    const b = crypto.createHash('sha256').update(expected).digest();
    return crypto.timingSafeEqual(a, b);
}

// This data is personal information: never let a browser or proxy cache it
router.use('/admin', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
});

router.post('/admin/login', adminLoginLimiter, (req, res) => {
    if (!process.env.ADMIN_PASSWORD) {
        return res.status(404).json({ error: 'Not found.' });   // stays off until configured
    }
    if (!passwordMatches(req.body && req.body.password)) {
        return res.status(401).json({ error: 'Incorrect password.' });
    }
    return res.json({ success: true, token: signAdminToken() });
});

router.get('/admin/orders', requireAdmin, (req, res) => {
    res.json({ orders: listOrders(), statuses: STATUSES });
});

router.patch('/admin/orders/:id', requireAdmin, (req, res) => {
    const id = Number(req.params.id);
    const status = String((req.body && req.body.status) || '');

    if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({ error: 'Invalid order id.' });
    }
    if (!STATUSES.includes(status)) {
        return res.status(400).json({ error: 'Unknown status.' });
    }
    if (!updateOrderStatus(id, status)) {
        return res.status(404).json({ error: 'Order not found.' });
    }
    return res.json({ success: true, id, status });
});

module.exports = router;