const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer' || !parts[1]) {
    return res.status(401).json({ error: 'Malformed token' });
  }
  const token = parts[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Defensive check: make sure the token actually carries what we expect.
    // A token signed with the right secret but missing id/role shouldn't
    // silently pass through and cause confusing failures downstream.
    if (!decoded || !decoded.id || !decoded.role) {
      return res.status(403).json({ error: 'Invalid token payload' });
    }

    req.user = decoded; // { id, role }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Your session has expired. Please log in again.', code: 'TOKEN_EXPIRED' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(403).json({ error: 'Invalid token. Please log in again.', code: 'TOKEN_INVALID' });
    }
    // Unexpected error (e.g. JWT_SECRET missing/misconfigured)
    console.error('JWT verification error:', err);
    return res.status(500).json({ error: 'Authentication error' });
  }
}

module.exports = verifyToken;