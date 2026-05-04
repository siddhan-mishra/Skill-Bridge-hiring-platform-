// authMiddleware.js — bulletproofed JWT protection
// Handles: missing token, malformed JWT, expired JWT, user not found
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  // Support: Authorization: Bearer <token>  OR  x-auth-token: <token>
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1]?.trim();
  } else if (req.headers['x-auth-token']) {
    token = req.headers['x-auth-token']?.trim();
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized — no token provided' });
  }

  // Fast structural pre-check before calling jwt.verify (avoids noisy stack traces)
  const parts = token.split('.');
  if (parts.length !== 3) {
    return res.status(401).json({ message: 'Not authorized — malformed token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'Not authorized — user no longer exists' });
    }
    req.user = user;
    next();
  } catch (err) {
    const msg = err.name === 'TokenExpiredError'
      ? 'Not authorized — token expired'
      : 'Not authorized — token invalid';
    // Only log in development to avoid log noise in production
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[authMiddleware] ${err.name}: ${err.message}`);
    }
    return res.status(401).json({ message: msg });
  }
};

// Optional role-guard factory: usage → authorize('recruiter') or authorize('seeker','recruiter')
const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Not authorized' });
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: `Access denied — requires role: ${roles.join(' or ')}` });
  }
  next();
};

module.exports = { protect, authorize };
