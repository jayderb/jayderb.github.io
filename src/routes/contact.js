const express = require('express');
const rateLimit = require('express-rate-limit');
const { insertMessage, markEmailed } = require('../db/database');
const { sendContactNotification } = require('../mailer');

const router = express.Router();

// Limit each IP to 5 submissions per 15 minutes to deter spam/abuse
const contactLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { error: 'Too many submissions. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateContactBody(body) {
    const errors = {};
    const name = (body.name || '').trim();
    const email = (body.email || '').trim();
    const subject = (body.subject || '').trim();
    const message = (body.message || '').trim();

    if (!name) errors.name = 'Name is required.';
    if (!email) {
        errors.email = 'Email is required.';
    } else if (!EMAIL_REGEX.test(email)) {
        errors.email = 'Please enter a valid email address.';
    }
    if (!message) errors.message = 'Message is required.';
    if (message.length > 5000) errors.message = 'Message is too long (max 5000 characters).';

    // Simple honeypot: bots often fill hidden fields
    if (body._honey) errors._honey = 'Spam detected.';

    return { errors, data: { name, email, subject, message } };
}

router.post('/contact', contactLimiter, async (req, res) => {
    const { errors, data } = validateContactBody(req.body);

    if (Object.keys(errors).length > 0) {
        return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    let messageId;
    try {
        messageId = insertMessage(data);
    } catch (err) {
        console.error('DB insert failed:', err);
        return res.status(500).json({ error: 'Could not save your message. Please try again.' });
    }

    try {
        await sendContactNotification(data);
        markEmailed(messageId);
    } catch (err) {
        // The message is already saved, so we don't fail the request over email issues —
        // just log it so it can be checked/resent manually if needed.
        console.error('Email send failed for message', messageId, err);
    }

    return res.status(201).json({ success: true, message: "Thanks — we've received your message." });
});

module.exports = router;