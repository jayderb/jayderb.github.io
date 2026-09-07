/* ============================================================
   KRINT TUFWALE — src/routes/auth.js
   POST /api/auth/signup — create an account, returns a JWT
   POST /api/auth/login  — sign in, returns a JWT
   GET  /api/auth/me     — who the Bearer token belongs to

   Passwords are hashed with bcryptjs (10 rounds) and never
   stored or logged in plaintext. Login failures always return
   the generic "Invalid email or password." — never revealing
   whether an email is registered. Signup MAY reveal that an
   email already has an account (409).
   ============================================================ */

const express = require('express');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const { createUser, getUserByEmail, getUserById } = require('../db/database');
const { signToken } = require('../auth');
const { requireAuth } = require('../middleware/requireAuth');

const router = express.Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+\d][\d\s\-()]{6,19}$/; // loose: +260 97..., 097..., etc.
const BCRYPT_ROUNDS = 10;

// Signup: 5 attempts per 15 min per IP
const signupLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { error: 'Too many sign-up attempts. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Login: 10 attempts per 15 min per IP (brute-force deterrence)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Too many sign-in attempts. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

/* Verified against when a login attempts an unknown email, so the
   response time does not reveal whether an account exists. */
const DUMMY_HASH = '$2b$10$CwTycUXWue0Thq9StjUM0uJ8.PbgIv0NrdeVmXWCMTUvWCDdWsCJC'; // bcrypt('dummy-password-for-timing')

function validateSignup(body) {
    const errors = {};

    const name = (body.name || '').trim();
    const email = (body.email || '').trim().toLowerCase();
    const phone = (body.phone || '').trim();
    const password = typeof body.password === 'string' ? body.password : '';

    if (!name) errors.name = 'Name is required.';
    else if (name.length < 2 || name.length > 80) errors.name = 'Name must be 2–80 characters.';

    if (!email) {
        errors.email = 'Email is required.';
    } else if (!EMAIL_REGEX.test(email) || email.length > 120) {
        errors.email = 'Please enter a valid email address.';
    }

    if (phone && !PHONE_REGEX.test(phone)) {
        errors.phone = 'Please enter a valid phone number.';
    }

    if (!password) {
        errors.password = 'Password is required.';
    } else if (password.length < 8) {
        errors.password = 'Password must be at least 8 characters.';
    } else if (password.length > 128) {
        errors.password = 'Password is too long (max 128 characters).';
    }

    return { errors, data: { name, email, phone, password } };
}

function publicUser(row) {
    return { id: row.id, name: row.name, email: row.email, phone: row.phone || '' };
}

router.post('/auth/signup', signupLimiter, async (req, res) => {
    const { errors, data } = validateSignup(req.body);

    if (Object.keys(errors).length > 0) {
        return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    let passwordHash;
    try {
        passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
    } catch (err) {
        console.error('Password hashing failed:', err);
        return res.status(500).json({ error: 'Could not create your account. Please try again.' });
    }

    let userId;
    try {
        userId = createUser({
            name: data.name,
            email: data.email,
            phone: data.phone,
            passwordHash,
        });
    } catch (err) {
        // UNIQUE constraint on users.email — signup MAY say so
        const isUniqueViolation =
            String(err.code || '').includes('SQLITE_CONSTRAINT') ||
            err.errcode === 2067 ||
            /UNIQUE constraint/i.test(err.message || '');

        if (isUniqueViolation) {
            return res.status(409).json({ error: 'An account with this email already exists.' });
        }

        console.error('User insert failed:', err);
        return res.status(500).json({ error: 'Could not create your account. Please try again.' });
    }

    const user = getUserById(userId);
    const token = signToken(user);

    return res.status(201).json({ success: true, token, user: publicUser(user) });
});

router.post('/auth/login', loginLimiter, async (req, res) => {
    const email = (req.body.email || '').trim().toLowerCase();
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = getUserByEmail(email);

    // Always run a bcrypt comparison so response timing is the same
    // whether or not the account exists
    let valid = false;
    try {
        if (user) {
            valid = await bcrypt.compare(password, user.password_hash);
        } else {
            await bcrypt.compare(password, DUMMY_HASH);
        }
    } catch (err) {
        console.error('Password comparison failed:', err);
        return res.status(500).json({ error: 'Could not sign you in. Please try again.' });
    }

    if (!user || !valid) {
        return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = signToken(user);

    return res.json({ success: true, token, user: publicUser(user) });
});

router.get('/auth/me', requireAuth, (req, res) => {
    const user = getUserById(req.user.id);

    if (!user) {
        return res.status(401).json({ error: 'Account no longer exists.' });
    }

    return res.json({ user: publicUser(user) });
});

module.exports = router;