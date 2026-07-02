#!/usr/bin/env node
const { hashSecret } = require('../services/passwordHash');

const secret = process.argv[2] || process.env.SECRET;

if (!secret) {
  console.error('Usage: SECRET=<value> node scripts/hash-secret.js');
  console.error('   or: node scripts/hash-secret.js <value>');
  process.exit(1);
}

try {
  console.log(hashSecret(secret));
} catch (err) {
  console.error(err?.message || err);
  process.exit(1);
}
