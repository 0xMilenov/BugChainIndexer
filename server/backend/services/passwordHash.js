const crypto = require('crypto');

const HASH_PREFIX = 'scrypt';
const SCRYPT_PARAMS = {
  N: 16384,
  r: 8,
  p: 1,
  keylen: 64,
};

function validateSecret(secret) {
  return typeof secret === 'string' && secret.length >= 8 && secret.length <= 256;
}

function hashSecret(secret) {
  if (!validateSecret(secret)) {
    throw new Error('Secret must be 8-256 characters');
  }
  const salt = crypto.randomBytes(16).toString('base64url');
  const derived = crypto.scryptSync(secret, salt, SCRYPT_PARAMS.keylen, {
    N: SCRYPT_PARAMS.N,
    r: SCRYPT_PARAMS.r,
    p: SCRYPT_PARAMS.p,
  });
  return [
    HASH_PREFIX,
    SCRYPT_PARAMS.N,
    SCRYPT_PARAMS.r,
    SCRYPT_PARAMS.p,
    salt,
    derived.toString('base64url'),
  ].join('$');
}

function verifySecret(secret, storedHash) {
  try {
    if (!secret || !storedHash) return false;
    const [prefix, nRaw, rRaw, pRaw, salt, key] = String(storedHash).split('$');
    if (prefix !== HASH_PREFIX || !salt || !key) return false;
    const N = Number(nRaw);
    const r = Number(rRaw);
    const p = Number(pRaw);
    const expected = Buffer.from(key, 'base64url');
    const actual = crypto.scryptSync(String(secret), salt, expected.length, { N, r, p });
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

module.exports = {
  hashSecret,
  verifySecret,
  validateSecret,
};
