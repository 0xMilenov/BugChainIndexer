#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * Backfill contract source code for existing verified contracts.
 * Fetches source from Etherscan and inserts into contract_sources table.
 *
 * Usage:
 *   NETWORK=ethereum LIMIT=100 node utils/backfill-contract-sources.js
 *   # All networks (omit NETWORK):
 *   LIMIT=500 node utils/backfill-contract-sources.js
 */

require('dotenv').config();

const {
  initializeDB,
  closeDB,
  getContractEtherscanEnrichment
} = require('../common/core');
const {
  ensureSchema,
  batchUpsertContractSources
} = require('../common/database');

const NETWORK = process.env.NETWORK ? process.env.NETWORK.toLowerCase() : null;
const LIMIT = Math.max(parseInt(process.env.LIMIT || '100', 10), 1);
const DELAY_MS = parseInt(process.env.DELAY_MS || '1500', 10);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  const db = await initializeDB();
  await ensureSchema(db);

  try {
    let query = `
      SELECT a.address, a.network
      FROM addresses a
      WHERE a.verified = true
        AND (a.address, a.network) NOT IN (
          SELECT address, network FROM contract_sources
        )
    `;
    const params = [];
    if (NETWORK) {
      params.push(NETWORK);
      query += ` AND a.network = $1`;
    }
    query += ` ORDER BY a.fund DESC NULLS LAST LIMIT $${params.length + 1}`;
    params.push(LIMIT);

    const { rows: targets } = await db.query(query, params);
    console.log(`[backfill-contract-sources] Targets: ${targets.length} (network=${NETWORK || 'all'})`);
    if (targets.length === 0) return;

    const sources = [];
    for (const row of targets) {
      try {
        const { etherscanRequest } = require('../common/core');
        const scanner = {
          network: row.network,
          etherscanCall: (params) => etherscanRequest(row.network, params),
          log: () => {}
        };
        const enrichment = await getContractEtherscanEnrichment(scanner, row.address);
        if (enrichment.sourceCode && enrichment.sourceCode.length > 0) {
          sources.push({
            address: row.address,
            network: row.network,
            sourceCode: enrichment.sourceCode,
            compilerVersion: enrichment.compilerVersion || null,
            optimizationUsed: enrichment.optimizationUsed || null,
            runs: enrichment.runs != null ? enrichment.runs : null
          });
        }
      } catch (err) {
        console.warn(`[backfill] ${row.address}@${row.network}: ${err.message}`);
      }
      await sleep(DELAY_MS);
    }

    if (sources.length > 0) {
      await batchUpsertContractSources(db, sources, { batchSize: 50 });
      console.log(`[backfill-contract-sources] Stored ${sources.length} contract sources`);
    }
  } finally {
    db.release();
    await closeDB();
  }
}

run().catch((err) => {
  console.error('[backfill-contract-sources] Fatal:', err);
  process.exit(1);
});
