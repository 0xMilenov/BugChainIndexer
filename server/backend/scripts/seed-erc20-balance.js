#!/usr/bin/env node
/**
 * Seed ERC-20 balance for ONE contract using the BACKEND's database connection.
 * This ensures we write to the exact same DB the API reads from.
 *
 * Usage (from project root):
 *   node server/backend/scripts/seed-erc20-balance.js
 *
 * Target: 0xB44a14BBFF7428998d9003E68fce93800f6FfD74 (AlgebraPool, ~13k USDC)
 */
const path = require('path');

// Load env in same order as backend index.js
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config({ path: path.join(__dirname, '../../../scanners/.env') });

const { pool } = require('../services/db');
const { getTokenBalanceEtherscan } = require('../../../scanners/common/core');

const TARGET_ADDRESS = '0xb44a14bbff7428998d9003e68fce93800f6ffd74';
const NETWORK = 'ethereum';
const USDC = {
  address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  symbol: 'USDC',
  decimals: 6
};

async function main() {
  console.log('Seeding ERC-20 balance for', TARGET_ADDRESS, 'on', NETWORK);
  console.log('Using same DB as backend (DATABASE_URL or PGDATABASE):', process.env.DATABASE_URL ? 'DATABASE_URL' : (process.env.PGDATABASE || 'default'));

  // 1. Fetch balance via Etherscan
  console.log('\n1. Fetching USDC balance via Etherscan...');
  let balanceStr;
  try {
    balanceStr = await getTokenBalanceEtherscan(NETWORK, TARGET_ADDRESS, USDC.address);
    const human = Number(balanceStr) / Math.pow(10, USDC.decimals);
    console.log('   USDC balance:', human.toLocaleString(), '(raw:', balanceStr, ')');
  } catch (err) {
    console.error('   Etherscan failed:', err.message);
    process.exit(1);
  }

  const balanceWei = BigInt(balanceStr);
  if (balanceWei === 0n) {
    console.log('   Balance is 0, nothing to store');
    process.exit(0);
  }

  // 2. Ensure table exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS contract_token_balances (
      address TEXT NOT NULL,
      network TEXT NOT NULL,
      token_address TEXT NOT NULL,
      symbol TEXT NOT NULL,
      decimals INTEGER NOT NULL,
      balance_wei NUMERIC(78, 0) NOT NULL,
      last_updated BIGINT NOT NULL,
      PRIMARY KEY (address, network, token_address)
    )
  `);

  // 3. Insert/upsert
  const now = Math.floor(Date.now() / 1000);
  await pool.query(`
    INSERT INTO contract_token_balances (address, network, token_address, symbol, decimals, balance_wei, last_updated)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (address, network, token_address) DO UPDATE SET
      balance_wei = EXCLUDED.balance_wei,
      last_updated = EXCLUDED.last_updated
  `, [TARGET_ADDRESS, NETWORK, USDC.address, USDC.symbol, USDC.decimals, balanceStr, now]);

  console.log('\n2. Stored in contract_token_balances');

  // 4. Verify we can read it back
  const check = await pool.query(`
    SELECT address, network, symbol, balance_wei, decimals
    FROM contract_token_balances
    WHERE LOWER(address) = LOWER($1) AND network = $2
  `, [TARGET_ADDRESS, NETWORK]);

  console.log('\n3. Verification (read from same DB):');
  if (check.rows.length === 0) {
    console.log('   ERROR: No rows found after insert!');
    process.exit(1);
  }
  check.rows.forEach(r => {
    const human = Number(r.balance_wei) / Math.pow(10, r.decimals);
    console.log('   ', r.symbol, ':', human.toLocaleString());
  });

  console.log('\nDone. Refresh the UI - the AlgebraPool row should show USDC balance.');
  console.log('Note: After deploying scanner/backend changes, restart the backend so it loads the latest code.');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
