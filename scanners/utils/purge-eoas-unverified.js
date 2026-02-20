#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * Purge EOAs, unverified contracts, and verified contracts without source code.
 * Use after migrating to verified+source-only storage.
 *
 * Usage:
 *   node utils/purge-eoas-unverified.js           # Dry run (default)
 *   node utils/purge-eoas-unverified.js --execute # Actually delete
 *   NETWORK=ethereum node utils/purge-eoas-unverified.js --execute
 */

require('dotenv').config();

const { initializeDB, closeDB } = require('../common/core');
const { ensureSchema } = require('../common/database');

const EXECUTE = process.argv.includes('--execute');
const NETWORK = process.env.NETWORK ? process.env.NETWORK.toLowerCase() : null;

async function run() {
  const db = await initializeDB();
  await ensureSchema(db);

  try {
    const networkClause = NETWORK ? ' WHERE network = $1' : '';
    const countParams = NETWORK ? [NETWORK] : [];

    // Count EOAs, unverified, and verified-without-source
    const countQuery = `
      SELECT
        COUNT(*) FILTER (WHERE 'EOA' = ANY(tags)) AS eoa_count,
        COUNT(*) FILTER (WHERE tags IS NOT NULL AND NOT ('EOA' = ANY(tags)) AND verified = false) AS unverified_count,
        COUNT(*) FILTER (WHERE verified = true AND NOT EXISTS (SELECT 1 FROM contract_sources cs WHERE cs.address = addresses.address AND cs.network = addresses.network)) AS verified_no_source_count
      FROM addresses
      ${networkClause}
    `;
    const { rows: [countRow] } = await db.query(countQuery, countParams);
    const eoaCount = parseInt(countRow.eoa_count, 10) || 0;
    const unverifiedCount = parseInt(countRow.unverified_count, 10) || 0;
    const verifiedNoSourceCount = parseInt(countRow.verified_no_source_count, 10) || 0;

    console.log(`[purge] EOAs: ${eoaCount}, Unverified: ${unverifiedCount}, Verified without source: ${verifiedNoSourceCount}`);
    if (eoaCount === 0 && unverifiedCount === 0 && verifiedNoSourceCount === 0) {
      console.log('[purge] Nothing to purge');
      return;
    }

    if (!EXECUTE) {
      console.log('[purge] Dry run. Use --execute to actually delete.');
      return;
    }

    const deleteQuery = `
      DELETE FROM addresses
      WHERE
        ('EOA' = ANY(tags))
        OR (tags IS NOT NULL AND NOT ('EOA' = ANY(tags)) AND verified = false)
        OR (verified = true AND NOT EXISTS (SELECT 1 FROM contract_sources cs WHERE cs.address = addresses.address AND cs.network = addresses.network))
      ${NETWORK ? 'AND network = $1' : ''}
    `;
    const deleteParams = NETWORK ? [NETWORK] : [];
    const result = await db.query(deleteQuery, deleteParams);
    console.log(`[purge] Deleted ${result.rowCount} rows`);
  } finally {
    db.release();
    await closeDB();
  }
}

run().catch((err) => {
  console.error('[purge] Fatal:', err);
  process.exit(1);
});
