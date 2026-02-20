#!/usr/bin/env node
/**
 * Backfill ERC-20 token balances for a specific address (or small batch).
 * Uses Etherscan tokenbalance API. Run to populate contract_token_balances for testing.
 * Uses backend's DB connection so data is written to the same DB the API reads from.
 *
 * Usage:
 *   NETWORK=ethereum ADDRESS=0xB44a14BBFF7428998d9003E68fce93800f6FfD74 node utils/backfill-erc20-balance.js
 *   NETWORK=ethereum node utils/backfill-erc20-balance.js  # processes first 5 contracts
 */
const path = require('path');
const fs = require('fs');
// Load env in same order as backend - ensures we use same DB
require('dotenv').config({ path: path.join(__dirname, '../../server/backend/.env') });
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { pool } = require('../../server/backend/services/db');
const { getTokenBalanceEtherscan, sleep } = require('../common/core');

const ERC20_API_DELAY_MS = parseInt(process.env.ERC20_API_DELAY_MS || '400', 10);
const { normalizeAddress } = require('../common');
const { NETWORKS } = require('../config/networks.js');

const CONTRACT_LIST_WHERE_VERIFIED = `(tags IS NULL OR NOT 'EOA' = ANY(tags)) AND verified = true AND EXISTS (SELECT 1 FROM contract_sources cs WHERE cs.address = addresses.address AND cs.network = addresses.network)`;
const CONTRACT_LIST_WHERE_ALL = `(tags IS NULL OR NOT 'EOA' = ANY(tags))`;

async function loadTokens(network, limit = 50) {
  const tokensFilePath = path.join(__dirname, '..', 'tokens', `${network}.json`);
  try {
    const tokensData = JSON.parse(fs.readFileSync(tokensFilePath, 'utf8'));
    return tokensData
      .filter(t => t.symbol && t.address)
      .sort((a, b) => (a.rank || Infinity) - (b.rank || Infinity))
      .slice(0, limit)
      .map(t => ({
        address: t.address.toLowerCase(),
        symbol: t.symbol,
        decimals: t.decimals ?? 18
      }));
  } catch (e) {
    console.error('Failed to load tokens:', e.message);
    return [];
  }
}

async function main() {
  const network = process.env.NETWORK || 'ethereum';
  const singleAddress = process.env.ADDRESS ? normalizeAddress(process.env.ADDRESS) : null;
  const config = NETWORKS[network];
  if (!config?.chainId || config.chainId === 0) {
    console.error('Invalid or non-EVM network:', network);
    process.exit(1);
  }

  const includeUnverified = process.env.ERC20_INCLUDE_UNVERIFIED === '1';
  const contractWhere = includeUnverified ? CONTRACT_LIST_WHERE_ALL : CONTRACT_LIST_WHERE_VERIFIED;

  let addresses = [];
  if (singleAddress) {
    const check = await pool.query(
      `SELECT a.address FROM addresses a WHERE LOWER(a.address) = LOWER($1) AND a.network = $2 AND ${contractWhere.replace(/addresses\./g, 'a.')}`,
      [singleAddress, network]
    );
    if (check.rows.length === 0) {
      console.error(`Address ${singleAddress} not found or not a verified contract with source`);
      await pool.end();
      process.exit(1);
    }
    addresses = [normalizeAddress(check.rows[0].address)];
    console.log(`Backfilling ERC-20 balances for ${addresses[0]} on ${network}`);
  } else {
    const result = await pool.query(`
      SELECT a.address FROM addresses a
      LEFT JOIN (SELECT address, network FROM contract_token_balances GROUP BY address, network) ctb
        ON a.address = ctb.address AND a.network = ctb.network
      WHERE a.network = $1 AND ctb.address IS NULL AND ${contractWhere.replace(/addresses\./g, 'a.')}
      LIMIT 5
    `, [network]);
    addresses = result.rows.map(r => normalizeAddress(r.address));
    console.log(`Backfilling ${addresses.length} contracts (first without ERC-20 data) on ${network}`);
  }

  const tokens = await loadTokens(network);
  if (tokens.length === 0) {
    console.error('No tokens loaded');
    await pool.end();
    process.exit(1);
  }
  console.log(`Using ${tokens.length} tokens (USDC, USDT, etc.)`);

  const now = Math.floor(Date.now() / 1000);
  for (const address of addresses) {
    console.log(`\nProcessing ${address}...`);
    if (singleAddress) {
      await pool.query('DELETE FROM contract_token_balances WHERE address = $1 AND network = $2', [address, network]);
    }
    const nonZero = [];
    for (const token of tokens) {
      try {
        await sleep(ERC20_API_DELAY_MS);
        const balanceStr = await getTokenBalanceEtherscan(network, address, token.address);
        const balanceWei = BigInt(balanceStr);
        if (balanceWei > 0n) {
          nonZero.push({
            address,
            network,
            token_address: token.address,
            symbol: token.symbol,
            decimals: token.decimals,
            balance_wei: balanceStr,
            last_updated: now
          });
          const human = Number(balanceStr) / Math.pow(10, token.decimals);
          console.log(`  ${token.symbol}: ${human.toLocaleString()}`);
        }
      } catch (err) {
        console.warn(`  ${token.symbol}: ${err.message}`);
        // Continue with other tokens - Etherscan rate limits are common
      }
    }
    for (const b of nonZero) {
      await pool.query(`
        INSERT INTO contract_token_balances (address, network, token_address, symbol, decimals, balance_wei, last_updated)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (address, network, token_address) DO UPDATE SET
          symbol = EXCLUDED.symbol, decimals = EXCLUDED.decimals,
          balance_wei = EXCLUDED.balance_wei, last_updated = EXCLUDED.last_updated
      `, [b.address, b.network, b.token_address, b.symbol, b.decimals, b.balance_wei, b.last_updated]);
    }
    console.log(`  Stored ${nonZero.length} non-zero balances`);
  }

  await pool.end();
  console.log('\nDone. Refresh the UI to see ERC-20 balances.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
