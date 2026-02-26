const { Router } = require('express');
const authService = require('../services/auth.service');
const { optionalAuth, SESSION_COOKIE_NAME } = require('../middleware/auth');
const crypto = require('crypto');

const router = Router();
const OAUTH_STATE_COOKIE = 'oauth_state';
const STATE_TTL_SECONDS = 10 * 60; // 10 minutes

const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
// Callback URL must be where the browser lands; with Next.js rewrites that's the frontend origin
const getCallbackUrl = () => `${FRONTEND_URL}/auth/github/callback`;

// Secure: must be true when frontend is HTTPS (browsers reject non-Secure cookies on HTTPS)
const isSecure = () => {
  try {
    return new URL(FRONTEND_URL).protocol === 'https:';
  } catch { return false; }
};

// Cookie domain: when frontend is on a different host (e.g. app.visualisa.xyz), the backend
// receives callback via nginx proxy, so we must set domain explicitly for the cookie
// to be sent when the user visits the frontend.
// For localhost, set domain so the cookie works for the frontend (e.g. localhost:3001)
// even though the callback is proxied from Next.js (backend sees request from Next.js server).
function getCookieDomain() {
  try {
    const u = new URL(FRONTEND_URL);
    const host = u.hostname;
    if (host === 'localhost') return 'localhost';
    if (host.startsWith('127.')) return host; // 127.0.0.1
    if (host) return host;
  } catch {}
  return undefined;
}

function getCookieOptions(name, maxAge, value) {
  const opts = {
    httpOnly: true,
    sameSite: 'lax',
  };
  if (maxAge != null) opts.maxAge = maxAge;
  opts.secure = isSecure();
  const domain = getCookieDomain();
  if (domain) opts.domain = domain;
  return opts;
}

/**
 * GET /auth/status - Whether auth is configured (no auth required)
 */
router.get('/status', (req, res) => {
  res.json({ ok: true, configured: authService.isAuthEnabled() });
});

/**
 * GET /auth/github - Redirect to GitHub OAuth
 */
router.get('/github', (req, res) => {
  if (!authService.isAuthEnabled()) {
    return res.status(404).json({ ok: false, error: 'Not found' });
  }
  const state = authService.generateState();
  const redirectUri = getCallbackUrl();
  const url = authService.getRedirectUrl(state, redirectUri);
  res.cookie(OAUTH_STATE_COOKIE, state, getCookieOptions(OAUTH_STATE_COOKIE, STATE_TTL_SECONDS));
  res.redirect(302, url);
});

/**
 * GET /auth/github/callback - OAuth callback
 */
router.get('/github/callback', async (req, res) => {
  const redirect = (url) => res.redirect(302, url);
  const redirectError = (msg) => redirect(`${FRONTEND_URL}/auth/error?message=${encodeURIComponent(msg)}`);
  if (!authService.isAuthEnabled()) {
    return redirectError('not_configured');
  }
  const { code, state, error: ghError, error_description: ghErrorDesc } = req.query;
  if (ghError) {
    return redirectError(ghError === 'redirect_uri_mismatch' ? 'redirect_uri_mismatch' : ghErrorDesc || ghError);
  }
  const oauthState = req.cookies?.[OAUTH_STATE_COOKIE];
  res.clearCookie(OAUTH_STATE_COOKIE, getCookieOptions(OAUTH_STATE_COOKIE));

  if (!code || !state) {
    console.error('[auth] callback missing code/state. query:', JSON.stringify(req.query), 'url:', req.originalUrl || req.url);
    return redirectError('missing_code_or_state');
  }
  // On port 8005 (run-local-ui.sh), skip oauth_state check - cookie often not sent across localhost ports
  const isLocalDev = String(process.env.PORT) === '8005';
  const skipStateCheck = isLocalDev;

  if (!oauthState && !skipStateCheck) {
    return redirectError('wrong_callback_url');
  }
  if (oauthState) {
    const stateBuf = Buffer.from(String(state), 'utf8');
    const oauthBuf = Buffer.from(String(oauthState), 'utf8');
    if (stateBuf.length !== oauthBuf.length) return redirectError('invalid_state');
    try {
      if (!crypto.timingSafeEqual(stateBuf, oauthBuf)) return redirectError('invalid_state');
    } catch {
      return redirectError('invalid_state');
    }
  }

  const redirectUri = getCallbackUrl();
  const user = await authService.exchangeCodeForUser(code, redirectUri);
  if (!user) return redirectError('token_exchange_failed');

  if (user.access_token) {
    await authService.storeGitHubToken(user.user_id, user.access_token);
  }

  const token = authService.createToken(user);
  const maxAge = authService.getSessionMaxAge();
  res.cookie(SESSION_COOKIE_NAME, token, getCookieOptions(SESSION_COOKIE_NAME, maxAge));
  res.redirect(302, `${FRONTEND_URL}/?from=oauth`);
});

/**
 * GET /auth/me - Current user (requires valid session)
 */
router.get('/me', optionalAuth, (req, res) => {
  if (!authService.isAuthEnabled()) {
    return res.status(404).json({ ok: false, error: 'Not found' });
  }
  if (!req.user) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }
  res.json({
    ok: true,
    username: req.user.login,
    avatar_url: req.user.avatar_url,
  });
});

/**
 * GET /auth/logout - Clear session and redirect
 */
router.get('/logout', (req, res) => {
  if (!authService.isAuthEnabled()) {
    return res.redirect(302, FRONTEND_URL);
  }
  const clearOpts = { httpOnly: true, sameSite: 'lax', secure: isSecure() };
  const domain = getCookieDomain();
  if (domain) clearOpts.domain = domain;
  res.clearCookie(SESSION_COOKIE_NAME, clearOpts);
  res.redirect(302, FRONTEND_URL);
});

module.exports = router;
