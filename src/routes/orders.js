/* ============================================================
   KRINT TUFWALE — src/routes/orders.js
   POST /api/orders      — place an order (requires sign-in)
   GET  /api/orders/:id  — look up your own order (requires sign-in)

   Prices are NEVER taken from the request body: items are
   validated against src/products-catalog.js and the total is
   recalculated server-side. Customer identity comes from the
   session, never from the request body.
   ============================================================ */
const { notifySeller } = require('../notifications');
const express = require('express');
const rateLimit = require('express-rate-limit');
const { createOrder, getOrder } = require('../db/database');
const { requireAuth } = require('../middleware/requireAuth');
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

const PHONE_REGEX = /^[+\d][\d\s\-()]{6,19}$/; // loose: +260 97..., 097..., etc.
const MAX_QTY_PER_LINE = 10;
const MAX_LINES = 50;

function validateOrderItems(rawItems) {
    const errors = {};
    const items = [];

    if (!Array.isArray(rawItems) || rawItems.length === 0) {
        errors.items = 'Your bag is empty.';
        return { errors, items };
    }

    if (rawItems.length > MAX_LINES) {
        errors.items = `Too many lines (max ${MAX_LINES}).`;
        return { errors, items };
    }

    for (const raw of rawItems) {
        const product = catalog.getProductById(raw && raw.id);
        const qty = Number(raw && raw.qty);
        const size = raw && typeof raw.size === "string" ? raw.size : "";
        const color = raw && typeof raw.color === "string" ? raw.color : "";

        if (!product) {
            errors.items = `Unknown product: ${(raw && raw.id) || '(missing id)'}`;
            break;
        }
        if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY_PER_LINE) {
            errors.items = `Invalid quantity for ${product.name} (1–${MAX_QTY_PER_LINE}).`;
            break;
        }

        if (!product.sizes.includes(size)) {
            errors.items = `Please choose a valid size for ${product.name}.`;
            break;
        }
        if (!product.colors.includes(color)) {
            errors.items = `Please choose a valid colour for ${product.name}.`;
            break;
        }

        const existing = items.find((item) => item.id === product.id && item.size === size && item.color === color);
        if (existing) {
            existing.qty += qty;
            existing.lineTotalZmw = existing.unitPriceZmw * existing.qty;
        } else {
            items.push({
                id: product.id,
                name: product.name,
                size,
                color,
                qty,
                unitPriceZmw: product.priceZmw,
                lineTotalZmw: product.priceZmw * qty,
            });
        }
    }

    return { errors, items };
}

router.post('/orders', orderLimiter, requireAuth, (req, res) => {
    const phone = (req.body.phone || '').trim();
    const deliveryAddress = (req.body.deliveryAddress || '').trim();

    const errors = {};

    // Phone + delivery address are required: payment and delivery
    // are arranged with the customer using these details.
    if (!phone) {
        errors.phone = 'Phone number is required.';
    } else if (!PHONE_REGEX.test(phone)) {
        errors.phone = 'Please enter a valid phone number.';
    }

    if (!deliveryAddress) {
        errors.deliveryAddress = 'Delivery address is required.';
    } else if (deliveryAddress.length < 5 || deliveryAddress.length > 300) {
        errors.deliveryAddress = 'Delivery address must be 5–300 characters.';
    }

        // Optional map pin: both coordinates or neither, and they must be real
    // coordinates. Rounded to 6 decimals (about 10 cm), which is plenty.
    let deliveryLat = null;
    let deliveryLng = null;
    const { deliveryLat: lat, deliveryLng: lng } = req.body;

    if (lat !== undefined && lat !== null || lng !== undefined && lng !== null) {
        const valid = typeof lat === 'number' && typeof lng === 'number'
            && Number.isFinite(lat) && Number.isFinite(lng)
            && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

        if (valid) {
            deliveryLat = Math.round(lat * 1e6) / 1e6;
            deliveryLng = Math.round(lng * 1e6) / 1e6;
        } else {
            errors.deliveryLocation = 'The delivery pin is not valid. Please choose it again.';
        }
    }

    const { errors: itemErrors, items } = validateOrderItems(req.body.items);
    Object.assign(errors, itemErrors);

    if (Object.keys(errors).length > 0) {
        return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    // Total is computed HERE, from the catalog — never from the client.
    // Name/email come from the signed-in session, not the request body.
    const totalZmw = items.reduce((sum, item) => sum + item.lineTotalZmw, 0);
    const orderData = {
        customerName: req.user.name,
        email: req.user.email,
        phone,
        deliveryAddress,
        deliveryLat,
        deliveryLng,
        items,
        totalZmw,
        userId: req.user.id,
    };

    let orderId;
    try {
        orderId = createOrder(orderData);
    } catch (err) {
        console.error('Order insert failed:', err);
        return res.status(500).json({ error: 'Could not save your order. Please try again.' });
    }

    notifySeller(orderId);   // not awaited: the customer shouldn't wait on Gmail

    return res.status(201).json({
        success: true,
        orderId,
        totalZmw,
    });
});

router.get('/orders/:id', requireAuth, (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({ error: 'Invalid order id.' });
    }

    const order = getOrder(id);

    // 404 (not 403) so the API never confirms other users' orders exist
    if (!order || order.user_id !== req.user.id) {
        return res.status(404).json({ error: 'Order not found.' });
    }

    return res.json({ order });
});

module.exports = router;