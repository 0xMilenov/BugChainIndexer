#!/usr/bin/env node
/**
 * Backfill ERC-20 token balances across multiple networks.
 * Uses Etherscan tokenbalance API. Run to seed contract_token_balances for all chains.
 * Uses backend's DB connection so data is written to the same DB the API reads from.
 *
 * Usage:
 *   node utils/backfill-erc20-all-networks.js
 *   NETWORKS=ethereum,arbitrum,base node utils/backfill-erc20-all-networks.js
 *   PER_NETWORK=10 node utils/backfill-erc20-all-networks.js  # 10 contracts per network (default: 20)
 */
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../../server/backend/.env') });
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { pool } = require('../../server/backend/services/db');
const { getTokenBalanceEtherscan } = require('../common/core');
const { normalizeAddress } = require('../common');
const { NETWORKS } = require('../config/networks.js');

const DEFAULT_NETWORKS = [
  'ethereum', 'binance', 'optimism', 'base', 'arbitrum', 'polygon', 'avalanche',
  'gnosis', 'linea', 'scroll', 'mantle', 'megaeth',
  'arbitrum-nova', 'celo', 'cronos', 'moonbeam', 'moonriver', 'opbnb', 'polygon-zkevm'
];

const DEFAULT_PER_NETWORK = 100;  // Contracts per network for initial seed
const DEFAULT_TOKEN_LIMIT = 100;  // All tokens from JSON (~100 per chain) - RPC batch has no rate limit

// Etherscan: 3 calls/sec. 400ms delay = 2.5 calls/sec (safe margin).
const ERC20_API_DELAY_MS = parseInt(process.env.ERC20_API_DELAY_MS || '400', 10);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CONTRACT_LIST_WHERE_VERIFIED = `(tags IS NULL OR NOT 'EOA' = ANY(tags)) AND verified = true AND EXISTS (SELECT 1 FROM contract_sources cs WHERE cs.address = addresses.address AND cs.network = addresses.network)`;
const CONTRACT_LIST_WHERE_ALL = `(tags IS NULL OR NOT 'EOA' = ANY(tags))`;

async function loadTokens(network, limit = 15) {
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
    return [];
  }
}

async function backfillNetwork(network, perNetwork, tokenLimit) {
  const config = NETWORKS[network];
  if (!config?.chainId || config.chainId === 0) {
    console.log(`  Skipping ${network}: no chainId or non-EVM`);
    return { skipped: true, reason: 'no chainId' };
  }

  const tokens = await loadTokens(network, tokenLimit || DEFAULT_TOKEN_LIMIT);
  if (tokens.length === 0) {
    console.log(`  Skipping ${network}: no tokens file`);
    return { skipped: true, reason: 'no tokens' };
  }

  const includeUnverified = process.env.ERC20_INCLUDE_UNVERIFIED === '1';
  const contractWhere = includeUnverified ? CONTRACT_LIST_WHERE_ALL : CONTRACT_LIST_WHERE_VERIFIED;
  const pilotLimit = process.env.ERC20_PILOT_LIMIT ? parseInt(process.env.ERC20_PILOT_LIMIT, 10) : null;
  const limit = pilotLimit != null && pilotLimit > 0 ? Math.min(perNetwork, pilotLimit) : perNetwork;

  const result = await pool.query(`
    SELECT a.address FROM addresses a
    LEFT JOIN (SELECT address, network FROM contract_token_balances GROUP BY address, network) ctb
      ON a.address = ctb.address AND a.network = ctb.network
    WHERE a.network = $1 AND ctb.address IS NULL AND ${contractWhere.replace(/addresses\./g, 'a.')}
    LIMIT $2
  `, [network, limit]);

  const addresses = result.rows.map(r => normalizeAddress(r.address));
  if (addresses.length === 0) {
    console.log(`  ${network}: no contracts without ERC-20 data`);
    return { processed: 0, stored: 0 };
  }

  const now = Math.floor(Date.now() / 1000);
  let totalStored = 0;

  for (const address of addresses) {
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
        }
      } catch (err) {
        // Continue - rate limits are common
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
    totalStored += nonZero.length;
  }

  return { processed: addresses.length, stored: totalStored };
}

async function main() {
  const networksEnv = process.env.NETWORKS;
  const networks = networksEnv
    ? networksEnv.split(/[,\s]+/).filter(Boolean)
    : DEFAULT_NETWORKS;

  const perNetwork = parseInt(process.env.PER_NETWORK || String(DEFAULT_PER_NETWORK), 10);
  const tokenLimit = parseInt(process.env.TOKEN_LIMIT || String(DEFAULT_TOKEN_LIMIT), 10);

  console.log(`Backfilling ERC-20 balances for ${networks.length} networks (${perNetwork} contracts/network)`);
  console.log('Networks:', networks.join(', '));

  const results = {};
  for (const network of networks) {
    process.stdout.write(`${network}... `);
    try {
      const r = await backfillNetwork(network, perNetwork, tokenLimit);
      results[network] = r;
      if (r.skipped) {
        console.log(`skipped (${r.reason})`);
      } else {
        console.log(`${r.processed} contracts, ${r.stored} balances`);
      }
    } catch (err) {
      console.log(`error: ${err.message}`);
      results[network] = { error: err.message };
    }
  }

  await pool.end();

  const summary = Object.entries(results).filter(([, r]) => !r.skipped && !r.error);
  const totalProcessed = summary.reduce((s, [, r]) => s + (r.processed || 0), 0);
  const totalStored = summary.reduce((s, [, r]) => s + (r.stored || 0), 0);

  console.log('\nDone.');
  console.log(`Processed ${totalProcessed} contracts, stored ${totalStored} token balances.`);
  console.log('Refresh the UI to see ERC-20 balances.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
