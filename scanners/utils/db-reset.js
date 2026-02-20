#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * Reset database - delete all collected data for a fresh start.
 * Keeps schema; clears addresses, contract_sources, excluded_blocks,
 * network_log_density_stats, and optionally caches.
 *
 * Usage:
 *   node utils/db-reset.js              # Dry run (show what would be deleted)
 *   node utils/db-reset.js --execute    # Actually reset
 */

require('dotenv').config();

const { initializeDB, closeDB } = require('../common/core');
const { ensureSchema } = require('../common/database');

const EXECUTE = process.argv.includes('--execute');

async function run() {
  const db = await initializeDB();
  await ensureSchema(db);

  try {
    const tables = [
      'addresses',
      'contract_sources',
      'excluded_blocks',
      'network_log_density_stats',
      'token_metadata_cache',
      'symbol_prices'
    ];

    if (!EXECUTE) {
      console.log('[db-reset] Dry run. Use --execute to actually reset.\n');
      for (const table of tables) {
        try {
          const { rows } = await db.query(
            `SELECT COUNT(*) AS n FROM ${table}`,
            []
          );
          const n = parseInt(rows[0]?.n || '0', 10);
          console.log(`  ${table}: ${n} rows`);
        } catch (err) {
          console.log(`  ${table}: (table may not exist)`);
        }
      }
      console.log('\n[db-reset] Run with --execute to truncate these tables.');
      return;
    }

    console.log('[db-reset] Resetting database...');

    // contract_sources has FK to addresses - truncate addresses with CASCADE
    await db.query('TRUNCATE TABLE addresses CASCADE');
    console.log('  Truncated addresses (and contract_sources via CASCADE)');

    // excluded_blocks
    try {
      await db.query('TRUNCATE TABLE excluded_blocks');
      console.log('  Truncated excluded_blocks');
    } catch (err) {
      if (!err.message.includes('does not exist')) console.warn('  excluded_blocks:', err.message);
    }

    // network_log_density_stats
    try {
      await db.query('TRUNCATE TABLE network_log_density_stats');
      console.log('  Truncated network_log_density_stats');
    } catch (err) {
      if (!err.message.includes('does not exist')) console.warn('  network_log_density_stats:', err.message);
    }

    // token_metadata_cache
    try {
      await db.query('TRUNCATE TABLE token_metadata_cache');
      console.log('  Truncated token_metadata_cache');
    } catch (err) {
      if (!err.message.includes('does not exist')) console.warn('  token_metadata_cache:', err.message);
    }

    // symbol_prices
    try {
      await db.query('TRUNCATE TABLE symbol_prices');
      console.log('  Truncated symbol_prices');
    } catch (err) {
      if (!err.message.includes('does not exist')) console.warn('  symbol_prices:', err.message);
    }

    console.log('\n[db-reset] Done. Run ./run.sh unified to start collecting verified contracts.');
  } finally {
    db.release();
    await closeDB();
  }
}

run().catch((err) => {
  console.error('[db-reset] Fatal:', err);
  process.exit(1);
});
