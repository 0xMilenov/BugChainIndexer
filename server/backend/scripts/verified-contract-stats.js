#!/usr/bin/env node
/**
 * Print verified contract stats across all chains.
 * Run from server/backend: node scripts/verified-contract-stats.js
 * Or with byNetwork: node scripts/verified-contract-stats.js --by-network
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { pool } = require('../services/db');

async function main() {
  const byNetwork = process.argv.includes('--by-network');
  const baseWhere = `(tags IS NULL OR NOT 'EOA' = ANY(tags))`;

  if (byNetwork) {
    const { rows } = await pool.query(`
      SELECT
        LOWER(network) AS network,
        COUNT(*)::bigint AS total,
        COUNT(*) FILTER (WHERE verified = true)::bigint AS verified
      FROM addresses
      WHERE ${baseWhere}
      GROUP BY LOWER(network)
      ORDER BY total DESC
    `);
    let totalAll = 0;
    let verifiedAll = 0;
    console.log('\nVerified contracts by chain:\n');
    console.log('Network      | Total    | Verified | % Verified');
    console.log('-------------|----------|----------|-----------');
    for (const r of rows) {
      const t = Number(r.total);
      const v = Number(r.verified);
      totalAll += t;
      verifiedAll += v;
      const pct = t > 0 ? ((v / t) * 100).toFixed(1) : '0';
      console.log(`${(r.network || 'unknown').padEnd(12)} | ${String(t).padStart(8)} | ${String(v).padStart(8)} | ${pct}%`);
    }
    console.log('-------------|----------|----------|-----------');
    console.log(`TOTAL        | ${String(totalAll).padStart(8)} | ${String(verifiedAll).padStart(8)} | ${totalAll > 0 ? ((verifiedAll / totalAll) * 100).toFixed(1) : 0}%`);
    console.log(`\nAll chains: ${verifiedAll.toLocaleString()} verified / ${totalAll.toLocaleString()} total contracts\n`);
  } else {
    const { rows } = await pool.query(`
      SELECT
        COUNT(*)::bigint AS total,
        COUNT(*) FILTER (WHERE verified = true)::bigint AS verified
      FROM addresses
      WHERE ${baseWhere}
    `);
    const r = rows[0];
    const total = Number(r.total);
    const verified = Number(r.verified);
    const unverified = total - verified;
    console.log(`\nVerified contracts (all chains): ${verified.toLocaleString()}`);
    console.log(`Total contracts:                 ${total.toLocaleString()}`);
    console.log(`Unverified:                     ${unverified.toLocaleString()}`);
    if (total > 0) {
      console.log(`Verified %:                      ${((verified / total) * 100).toFixed(1)}%\n`);
    }
  }
  await pool.end();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
