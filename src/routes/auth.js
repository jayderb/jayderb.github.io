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
const { checkPasswordRules, isPasswordBreached, BREACHED_MESSAGE } = require('../passwordPolicy');
const express = require('express');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const {
    createUser,
    getUserByEmail,
    getUserById,
    createPasswordReset,
    getValidPasswordReset,
    completePasswordReset,
} = require('../db/database');
const { sendPasswordReset } = require('../mailer');
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

        const passwordError = checkPasswordRules(password, { name, email });
    if (passwordError) errors.password = passwordError;
}

function publicUser(row) {
    return { id: row.id, name: row.name, email: row.email, phone: row.phone || '' };
}

router.post('/auth/signup', signupLimiter, async (req, res) => {
    const { errors, data } = validateSignup(req.body);

    if (Object.keys(errors).length > 0) {
        return res.status(400).json({ error: 'Validation failed', details: errors });
    }
        if (await isPasswordBreached(data.password)) {
        return res.status(400).json({
            error: 'Validation failed',
            details: { password: BREACHED_MESSAGE },
        });
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

/* ------------------------------------------------------------
   Forgot / reset password
   ------------------------------------------------------------ */

// 5 reset emails per 15 min per IP, so nobody can use this to spam an inbox
const forgotLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { error: 'Too many requests. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const resetLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Too many attempts. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

// The link's host comes from config, never from the request: a forged
// Host header must not be able to point a reset link at someone else's site.
function frontendUrl() {
    const configured = process.env.FRONTEND_URL
        || (process.env.ALLOWED_ORIGINS || '').split(',')[0]
        || 'http://localhost:5500';
    return configured.trim().replace(/\/$/, '');
}

const INVALID_LINK = 'This reset link is invalid or has expired. Please request a new one.';

router.post('/auth/forgot-password', forgotLimiter, (req, res) => {
    const email = (req.body.email || '').trim().toLowerCase();

    if (!email || !EMAIL_REGEX.test(email)) {
        return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    const user = getUserByEmail(email);

    if (user) {
        const token = crypto.randomBytes(32).toString('hex');
        createPasswordReset(user.id, sha256(token));

        const link = `${frontendUrl()}/reset-password.html#token=${token}`;

        // Not awaited, so the response is just as fast whether or not the account exists
        sendPasswordReset({ to: user.email, name: user.name, link })
            .catch((err) => console.error('Password reset email failed:', err.message));
    }

    // Same answer either way: never reveal which emails have accounts
    return res.json({
        success: true,
        message: 'If an account exists for that email, we have sent a link to reset the password.',
    });
});

router.post('/auth/reset-password', resetLimiter, async (req, res) => {
    const token = typeof req.body.token === 'string' ? req.body.token.trim() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    if (!/^[a-f0-9]{64}$/.test(token)) {
        return res.status(400).json({ error: INVALID_LINK });
    }

    const reset = getValidPasswordReset(sha256(token));

    // The same rules as sign-up, including "no name or email inside the password"
    const account = getUserById(reset.user_id);
    const passwordError = checkPasswordRules(password, {
        name: account && account.name,
        email: account && account.email,
    });

    if (passwordError) {
        return res.status(400).json({
            error: 'Validation failed',
            details: { password: passwordError },
        });
    }

    if (await isPasswordBreached(password)) {
        return res.status(400).json({
            error: 'Validation failed',
            details: { password: BREACHED_MESSAGE },
        });
    }
    let passwordHash;
    try {
        passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    } catch (err) {
        console.error('Password hashing failed:', err);
        return res.status(500).json({ error: 'Could not reset your password. Please try again.' });
    }

    completePasswordReset(reset.user_id, passwordHash);

    return res.json({ success: true, message: 'Your password has been reset. You can now sign in.' });
});

module.exports = router;