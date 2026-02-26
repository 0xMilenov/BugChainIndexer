const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { pool } = require('./db');

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || '';
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || '';
const AUTH_JWT_SECRET = process.env.AUTH_JWT_SECRET || 'change-me-in-production';
const GITHUB_TOKEN_ENCRYPTION_KEY = process.env.GITHUB_TOKEN_ENCRYPTION_KEY || AUTH_JWT_SECRET;
const AUTH_JWT_TTL_DAYS = Number(process.env.AUTH_JWT_TTL_DAYS || 30);
const ALGORITHM = 'HS256';

const isAuthEnabled = () => Boolean(GITHUB_CLIENT_ID && GITHUB_CLIENT_SECRET);

function getEncryptionKey() {
  return crypto.createHash('sha256').update(GITHUB_TOKEN_ENCRYPTION_KEY).digest();
}

function encryptToken(plaintext) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return iv.toString('base64') + ':' + encrypted;
}

function decryptToken(ciphertext) {
  const key = getEncryptionKey();
  const [ivB64, encrypted] = String(ciphertext).split(':');
  if (!ivB64 || !encrypted) return null;
  const iv = Buffer.from(ivB64, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encrypted, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Generate a cryptographically secure OAuth state string.
 * @returns {string}
 */
function generateState() {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Build GitHub OAuth authorize URL.
 * @param {string} state - CSRF state token
 * @param {string} redirectUri - Callback URL (must match GitHub app config)
 * @returns {string}
 */
function getRedirectUrl(state, redirectUri) {
  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: 'repo',
    state,
  });
  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for GitHub user info and access token.
 * @param {string} code - OAuth authorization code from callback
 * @param {string} redirectUri - Same redirect URI used in authorize step
 * @returns {Promise<{user_id: string, login: string, avatar_url: string|null, access_token: string}|null>}
 */
async function exchangeCodeForUser(code, redirectUri) {
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri,
    }),
  });
  const tokenData = await tokenRes.json();
  const accessToken = tokenData?.access_token;
  if (!accessToken) return null;

  const userRes = await fetch('https://api.github.com/user', {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const userData = await userRes.json();
  if (!userData?.id || !userData?.login) return null;

  return {
    user_id: String(userData.id),
    login: userData.login,
    avatar_url: userData.avatar_url || null,
    access_token: accessToken,
  };
}

/**
 * Store GitHub access token for a user (encrypted).
 * @param {string} userId
 * @param {string} accessToken
 */
async function storeGitHubToken(userId, accessToken) {
  const encrypted = encryptToken(accessToken);
  await pool.query(
    `INSERT INTO github_tokens (user_id, access_token_encrypted, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (user_id) DO UPDATE SET access_token_encrypted = $2, updated_at = NOW()`,
    [userId, encrypted]
  );
}

/**
 * Get decrypted GitHub access token for a user.
 * @param {string} userId
 * @returns {Promise<string|null>}
 */
async function getGitHubToken(userId) {
  const { rows } = await pool.query(
    'SELECT access_token_encrypted FROM github_tokens WHERE user_id = $1',
    [userId]
  );
  if (!rows.length) return null;
  return decryptToken(rows[0].access_token_encrypted);
}

/**
 * Create a JWT for the given user.
 * @param {{user_id: string, login: string, avatar_url: string|null}} user
 * @returns {string}
 */
function createToken(user) {
  const ttlSeconds = AUTH_JWT_TTL_DAYS * 24 * 60 * 60;
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = {
    user_id: user.user_id,
    login: user.login,
    avatar_url: user.avatar_url,
    exp,
  };
  return jwt.sign(payload, AUTH_JWT_SECRET, { algorithm: ALGORITHM });
}

/**
 * Verify and decode a JWT.
 * @param {string} token
 * @returns {{user_id: string, login: string, avatar_url: string|null}|null}
 */
function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, AUTH_JWT_SECRET, {
      algorithms: [ALGORITHM],
    });
    return {
      user_id: decoded.user_id,
      login: decoded.login,
      avatar_url: decoded.avatar_url || null,
    };
  } catch {
    return null;
  }
}

/**
 * Get session cookie max-age in seconds.
 * @returns {number}
 */
function getSessionMaxAge() {
  return AUTH_JWT_TTL_DAYS * 24 * 60 * 60;
}

module.exports = {
  isAuthEnabled,
  generateState,
  getRedirectUrl,
  exchangeCodeForUser,
  createToken,
  verifyToken,
  getSessionMaxAge,
  storeGitHubToken,
  getGitHubToken,
};
