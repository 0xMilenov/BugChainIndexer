#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * Backfill Etherscan enrichment fields for existing contracts.
 *
 * Usage:
 *   NETWORK=ethereum LIMIT=200 node utils/backfill-etherscan-enrichment.js
 */

const {
  initializeDB,
  closeDB,
  etherscanRequest,
  getContractEtherscanEnrichment
} = require('../common/core');
const {
  ensureSchema,
  batchUpsertAddresses
} = require('../common/database');

const NETWORK = (process.env.NETWORK || 'ethereum').toLowerCase();
const LIMIT = Math.max(parseInt(process.env.LIMIT || '200', 10), 1);

async function run() {
  const db = await initializeDB();
  await ensureSchema(db);

  try {
    const rowsResult = await db.query(`
      SELECT
        address, network, code_hash, contract_name, deployed, last_updated, first_seen,
        tags, fund, last_fund_updated, name_checked, name_checked_at
      FROM addresses
      WHERE network = $1
        AND (tags IS NULL OR 'EOA' != ALL(tags))
        AND (
          fetched_at IS NULL
          OR deploy_tx_hash IS NULL
          OR deployed_at_timestamp IS NULL
        )
      ORDER BY fund DESC NULLS LAST
      LIMIT $2
    `, [NETWORK, LIMIT]);

    const targets = rowsResult.rows || [];
    console.log(`[backfill] Network=${NETWORK} targets=${targets.length}`);
    if (targets.length === 0) return;

    const scanner = {
      network: NETWORK,
      etherscanCall: (params) => etherscanRequest(NETWORK, params),
      log: (...args) => console.log('[backfill]', ...args)
    };

    const updates = [];
    for (const row of targets) {
      try {
        const enrichment = await getContractEtherscanEnrichment(scanner, row.address);
        updates.push({
          address: row.address,
          network: row.network,
          codeHash: row.code_hash,
          contractName: enrichment.contractName ?? row.contract_name ?? null,
          deployed: enrichment.deployedAtTimestamp || row.deployed || null,
          verified: enrichment.verified,
          isProxy: enrichment.isProxy,
          implementationAddress: enrichment.implementationAddress,
          proxyContractName: enrichment.proxyContractName,
          implementationContractName: enrichment.implementationContractName,
          deployTxHash: enrichment.deployTxHash,
          deployerAddress: enrichment.deployerAddress,
          deployBlockNumber: enrichment.deployBlockNumber,
          deployedAtTimestamp: enrichment.deployedAtTimestamp,
          deployedAt: enrichment.deployedAt,
          confidence: enrichment.confidence,
          fetchedAt: enrichment.fetchedAt,
          tags: row.tags || ['Contract'],
          lastUpdated: Math.floor(Date.now() / 1000),
          firstSeen: row.first_seen,
          fund: row.fund || 0,
          lastFundUpdated: row.last_fund_updated || 0,
          nameChecked: true,
          nameCheckedAt: Math.floor(Date.now() / 1000)
        });
      } catch (error) {
        console.warn(`[backfill] ${row.address} failed: ${error.message}`);
        updates.push({
          address: row.address,
          network: row.network,
          codeHash: row.code_hash,
          contractName: row.contract_name || null,
          deployed: row.deployed || null,
          tags: row.tags || ['Contract'],
          lastUpdated: Math.floor(Date.now() / 1000),
          firstSeen: row.first_seen,
          fund: row.fund || 0,
          lastFundUpdated: row.last_fund_updated || 0,
          nameChecked: false,
          nameCheckedAt: 0
        });
      }
    }

    await batchUpsertAddresses(db, updates, { batchSize: 100 });
    console.log(`[backfill] Updated ${updates.length} rows`);
  } finally {
    db.release();
    await closeDB();
  }
}

run().catch((error) => {
  console.error('[backfill] Fatal error:', error);
  process.exit(1);
});

