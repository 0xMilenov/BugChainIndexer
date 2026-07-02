const { Router } = require('express');
const authService = require('../services/auth.service');
const { optionalAuth, SESSION_COOKIE_NAME } = require('../middleware/auth');

const router = Router();

const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');

const isSecure = () => {
  try {
    return new URL(FRONTEND_URL).protocol === 'https:';
  } catch {
    return false;
  }
};

function getCookieDomain() {
  try {
    const u = new URL(FRONTEND_URL);
    const host = u.hostname;
    if (host === 'localhost') return 'localhost';
    if (host.startsWith('127.')) return host;
    if (host) return host;
  } catch {}
  return undefined;
}

function getCookieOptions(maxAgeSeconds) {
  const opts = {
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecure(),
  };
  if (maxAgeSeconds != null) opts.maxAge = maxAgeSeconds * 1000;
  const domain = getCookieDomain();
  if (domain) opts.domain = domain;
  return opts;
}

function publicUser(user) {
  return {
    username: user.login,
    avatar_url: user.avatar_url || null,
    role: user.role || 'user',
  };
}

function setSessionCookie(res, user) {
  const token = authService.createToken(user);
  res.cookie(SESSION_COOKIE_NAME, token, getCookieOptions(authService.getSessionMaxAge()));
}

router.get('/status', (req, res) => {
  res.json({
    ok: true,
    configured: authService.isAuthEnabled(),
    signup_enabled: authService.isSignupEnabled(),
    provider: 'local',
  });
});

router.post('/login', async (req, res) => {
  try {
    const username = req.body?.username;
    const password = req.body?.password;
    const user = await authService.authenticate(username, password);
    if (!user) {
      return res.status(401).json({ ok: false, error: 'Invalid username or password' });
    }
    setSessionCookie(res, user);
    res.json({ ok: true, user: publicUser(user) });
  } catch (err) {
    console.error('[auth] login failed:', err?.message || err);
    res.status(500).json({ ok: false, error: 'Internal Server Error' });
  }
});

router.post('/signup', async (req, res) => {
  try {
    const result = await authService.signup({
      username: req.body?.username,
      password: req.body?.password,
      accessCode: req.body?.accessCode,
    });
    if (!result.ok) {
      const status = result.error === 'Username already exists' ? 409 : 400;
      return res.status(status).json({ ok: false, error: result.error });
    }
    setSessionCookie(res, result.user);
    res.status(201).json({ ok: true, user: publicUser(result.user) });
  } catch (err) {
    console.error('[auth] signup failed:', err?.message || err);
    res.status(500).json({ ok: false, error: 'Internal Server Error' });
  }
});

router.get('/me', optionalAuth, (req, res) => {
  if (!req.user) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }
  res.json({ ok: true, ...publicUser(req.user) });
});

router.get('/logout', (req, res) => {
  const clearOpts = getCookieOptions();
  delete clearOpts.maxAge;
  res.clearCookie(SESSION_COOKIE_NAME, clearOpts);
  res.redirect(302, FRONTEND_URL);
});

module.exports = router;
