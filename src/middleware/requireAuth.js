/* ============================================================
   KRINT TUFWALE — src/middleware/requireAuth.js
   Guards routes that need a signed-in user. Reads
       Authorization: Bearer <token>
   verifies the JWT, and attaches the user to req.user:
       { id, name, email }
   Responds 401 when the token is missing, malformed, expired,
   or signed by someone else.
   ============================================================ */

const { verifyToken } = require('../auth');

function requireAuth(req, res, next) {
    const header = req.headers.authorization || '';

    if (!header.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required. Please sign in.' });
    }

    const user = verifyToken(header.slice(7).trim());

    if (!user) {
        return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
    }

    req.user = user;
    next();
}

module.exports = { requireAuth };