#!/usr/bin/env node
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local'), override: true });

const authService = require('../services/auth.service');
const { pool } = require('../services/db');

const username = process.env.LOCAL_AUTH_USERNAME || process.argv[2];
const password = process.env.LOCAL_AUTH_PASSWORD || process.argv[3];
const role = process.env.LOCAL_AUTH_ROLE || process.argv[4] || 'admin';

async function main() {
  if (!username || !password) {
    console.error('Usage: LOCAL_AUTH_USERNAME=<name> LOCAL_AUTH_PASSWORD=<password> node scripts/create-local-user.js');
    console.error('   or: node scripts/create-local-user.js <name> <password> [role]');
    process.exit(1);
  }

  const login = authService.normalizeUsername(username);
  const passwordHash = authService.hashSecret(password);

  await pool.query(
    `INSERT INTO local_users (username, password_hash, role, disabled, created_at, updated_at)
     VALUES ($1, $2, $3, false, NOW(), NOW())
     ON CONFLICT (username) DO UPDATE SET
       password_hash = EXCLUDED.password_hash,
       role = EXCLUDED.role,
       disabled = false,
       updated_at = NOW()`,
    [login, passwordHash, role]
  );

  console.log(`Local user '${login}' is ready (${role}).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
