const authService = require('../services/auth.service');

const SESSION_COOKIE_NAME = 'session';

/**
 * Middleware that requires a valid session. Attaches req.user or returns 401.
 */
function requireAuth(req, res, next) {
  const token = req.cookies?.[SESSION_COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }
  const user = authService.verifyToken(token);
  if (!user) {
    res.clearCookie(SESSION_COOKIE_NAME, { httpOnly: true, sameSite: 'lax' });
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }
  req.user = user;
  next();
}

/**
 * Middleware that optionally attaches req.user if a valid session exists.
 * Never returns 401; req.user may be null.
 */
function optionalAuth(req, res, next) {
  const token = req.cookies?.[SESSION_COOKIE_NAME];
  if (!token) {
    req.user = null;
    return next();
  }
  const user = authService.verifyToken(token);
  req.user = user || null;
  next();
}

module.exports = {
  requireAuth,
  optionalAuth,
  SESSION_COOKIE_NAME,
};
