/* ============================================================
   KRINT TUFWALE — src/auth.js
   JWT helpers. No cookies — the frontend (GitHub Pages) and the
   backend (Render/Railway) are different origins, so tokens are
   returned in the response body, kept in the client's
   sessionStorage, and sent back as
       Authorization: Bearer <token>

   Tokens are HS256-signed with JWT_SECRET and expire after 7
   days. Set JWT_SECRET in production (see .env.example) — a
   random dev secret is generated for local development.
   ============================================================ */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const TOKEN_TTL = '7d';

// In production JWT_SECRET MUST come from the environment.
// Locally, fall back to a per-process random secret so nothing
// predictable ever signs tokens.
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');

if (!process.env.JWT_SECRET) {
    console.warn('JWT_SECRET not set — using a random dev secret (tokens reset on restart).');
}

/* Sign a token for a user row. The payload carries only what the
   frontend needs to display (id/name/email) — never the hash. */
function signToken(user) {
    return jwt.sign(
        {
            sub: String(user.id),
            name: user.name,
            email: user.email,
        },
        JWT_SECRET,
        { expiresIn: TOKEN_TTL }
    );
}

/* Verify a token and return { id, name, email } or null.
   id comes back as a number (sub is numeric string). */
function verifyToken(token) {
    try {
        const payload = jwt.verify(token, JWT_SECRET); // throws if invalid/expired
        const id = Number(payload.sub);

        if (!Number.isInteger(id) || id < 1) return null;

        return {
            id,
            name: typeof payload.name === 'string' ? payload.name : '',
            email: typeof payload.email === 'string' ? payload.email : '',
        };
    } catch (err) {
        return null;
    }
}

module.exports = {
    signToken,
    verifyToken,
    TOKEN_TTL,
};