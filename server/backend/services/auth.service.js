const jwt = require('jsonwebtoken');
const { pool } = require('./db');
const { hashSecret, verifySecret, validateSecret } = require('./passwordHash');

const AUTH_JWT_SECRET = process.env.AUTH_JWT_SECRET || 'change-me-in-production';
const AUTH_JWT_TTL_DAYS = Number(process.env.AUTH_JWT_TTL_DAYS || 30);
const LOCAL_AUTH_ACCESS_CODE_HASH = process.env.LOCAL_AUTH_ACCESS_CODE_HASH || '';
const ALGORITHM = 'HS256';

function isAuthEnabled() {
  return Boolean(AUTH_JWT_SECRET);
}

function isSignupEnabled() {
  return Boolean(LOCAL_AUTH_ACCESS_CODE_HASH);
}

function normalizeUsername(username) {
  return String(username || '').trim().toLowerCase();
}

function validateUsername(username) {
  return /^[a-z0-9_.-]{3,32}$/.test(username);
}

function validatePassword(password) {
  return validateSecret(password);
}

async function getUserByUsername(username) {
  const login = normalizeUsername(username);
  if (!login) return null;
  const { rows } = await pool.query(
    `SELECT username, password_hash, role, disabled
       FROM local_users
      WHERE username = $1`,
    [login]
  );
  return rows[0] || null;
}

async function authenticate(username, password) {
  const user = await getUserByUsername(username);
  if (!user || user.disabled) return null;
  if (!verifySecret(password, user.password_hash)) return null;
  return {
    user_id: user.username,
    login: user.username,
    avatar_url: null,
    role: user.role || 'user',
  };
}

async function createLocalUser({ username, password, role = 'user' }) {
  const login = normalizeUsername(username);
  if (!validateUsername(login)) {
    return { ok: false, error: 'Invalid username' };
  }
  if (!validatePassword(password)) {
    return { ok: false, error: 'Password must be at least 8 characters' };
  }
  const passwordHash = hashSecret(password);
  try {
    await pool.query(
      `INSERT INTO local_users (username, password_hash, role, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())`,
      [login, passwordHash, role]
    );
  } catch (err) {
    if (err?.code === '23505') {
      return { ok: false, error: 'Username already exists' };
    }
    throw err;
  }
  return {
    ok: true,
    user: {
      user_id: login,
      login,
      avatar_url: null,
      role,
    },
  };
}

async function signup({ username, password, accessCode }) {
  if (!isSignupEnabled()) {
    return { ok: false, error: 'Signup is not enabled' };
  }
  if (!verifySecret(accessCode, LOCAL_AUTH_ACCESS_CODE_HASH)) {
    return { ok: false, error: 'Invalid access code' };
  }
  return createLocalUser({ username, password, role: 'user' });
}

function createToken(user) {
  const ttlSeconds = AUTH_JWT_TTL_DAYS * 24 * 60 * 60;
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = {
    user_id: user.user_id,
    login: user.login,
    avatar_url: user.avatar_url || null,
    role: user.role || 'user',
    exp,
  };
  return jwt.sign(payload, AUTH_JWT_SECRET, { algorithm: ALGORITHM });
}

function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, AUTH_JWT_SECRET, {
      algorithms: [ALGORITHM],
    });
    return {
      user_id: decoded.user_id,
      login: decoded.login,
      avatar_url: decoded.avatar_url || null,
      role: decoded.role || 'user',
    };
  } catch {
    return null;
  }
}

function getSessionMaxAge() {
  return AUTH_JWT_TTL_DAYS * 24 * 60 * 60;
}

module.exports = {
  isAuthEnabled,
  isSignupEnabled,
  normalizeUsername,
  validateUsername,
  hashSecret,
  verifySecret,
  authenticate,
  createLocalUser,
  signup,
  createToken,
  verifyToken,
  getSessionMaxAge,
};
