const { verifyAdminToken } = require('../auth');

function requireAdmin(req, res, next) {
    const header = req.headers.authorization || '';

    if (!header.startsWith('Bearer ') || !verifyAdminToken(header.slice(7).trim())) {
        return res.status(401).json({ error: 'Admin sign-in required.' });
    }
    next();
}

module.exports = { requireAdmin };