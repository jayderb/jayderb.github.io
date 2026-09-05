/* ============================================================
   KRINT TUFWALE — src/routes/orders.js
   POST /api/orders      — place an order from the cart
   GET  /api/orders/:id  — look up a single order

   Prices are NEVER taken from the request body: items are
   validated against src/products-catalog.js and the total is
   recalculated server-side.
   ============================================================ */

const express = require('express');
const rateLimit = require('express-rate-limit');
const { createOrder, getOrder } = require('../db/database');
const catalog = require('../products-catalog');

const router = express.Router();

// Limit each IP to 10 orders per 15 minutes
const orderLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Too many orders placed. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+\d][\d\s\-()]{6,19}$/; // loose: +260 97..., 097..., etc.
const MAX_QTY_PER_LINE = 10;
const MAX_LINES = 50;

function validateOrderBody(body) {
    const errors = {};

    const customerName = (body.customerName || '').trim();
    const email = (body.email || '').trim();
    const phone = (body.phone || '').trim();
    const rawItems = Array.isArray(body.items) ? body.items : [];

    if (!customerName) errors.customerName = 'Name is required.';
    else if (customerName.length > 100) errors.customerName = 'Name is too long.';

    if (!email) {
        errors.email = 'Email is required.';
    } else if (!EMAIL_REGEX.test(email)) {
        errors.email = 'Please enter a valid email address.';
    }

    if (phone && !PHONE_REGEX.test(phone)) {
        errors.phone = 'Please enter a valid phone number.';
    }

    if (rawItems.length === 0) {
        errors.items = 'Your bag is empty.';
    } else if (rawItems.length > MAX_LINES) {
        errors.items = `Too many lines (max ${MAX_LINES}).`;
    }

    // Consolidate duplicate lines, validate each against the catalog
    const items = [];
    if (!errors.items) {
        for (const raw of rawItems) {
            const product = catalog.getProductById(raw && raw.id);
            const qty = Number(raw && raw.qty);

            if (!product) {
                errors.items = `Unknown product: ${(raw && raw.id) || '(missing id)'}`;
                break;
            }
            if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY_PER_LINE) {
                errors.items = `Invalid quantity for ${product.name} (1–${MAX_QTY_PER_LINE}).`;
                break;
            }

            const existing = items.find((item) => item.id === product.id);
            if (existing) {
                existing.qty += qty;
                existing.lineTotalZmw = existing.unitPriceZmw * existing.qty;
            } else {
                items.push({
                    id: product.id,
                    name: product.name,
                    qty,
                    unitPriceZmw: product.priceZmw,
                    lineTotalZmw: product.priceZmw * qty,
                });
            }
        }
    }

    // Total is computed HERE, from the catalog — never from the client
    const totalZmw = items.reduce((sum, item) => sum + item.lineTotalZmw, 0);

    return { errors, data: { customerName, email, phone, items, totalZmw } };
}

router.post('/orders', orderLimiter, (req, res) => {
    const { errors, data } = validateOrderBody(req.body);

    if (Object.keys(errors).length > 0) {
        return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    let orderId;
    try {
        orderId = createOrder(data);
    } catch (err) {
        console.error('Order insert failed:', err);
        return res.status(500).json({ error: 'Could not save your order. Please try again.' });
    }

    return res.status(201).json({
        success: true,
        orderId,
        totalZmw: data.totalZmw,
    });
});

router.get('/orders/:id', (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({ error: 'Invalid order id.' });
    }

    const order = getOrder(id);

    if (!order) {
        return res.status(404).json({ error: 'Order not found.' });
    }

    return res.json({ order });
});

module.exports = router;