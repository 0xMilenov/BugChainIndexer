#!/usr/bin/env node
/**
 * Check if a contract exists in the database.
 * Usage: node scripts/check-contract.js <network> <address>
 * Example: node scripts/check-contract.js avalanche 0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { pool } = require('../services/db');

async function main() {
  const network = process.argv[2] || 'avalanche';
  const address = (process.argv[3] || '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7').toLowerCase();

  console.log(`Checking contract: ${address} on ${network}\n`);

  const { rows: addrRows } = await pool.query(
    `SELECT address, network, contract_name, verified, tags
     FROM addresses
     WHERE LOWER(address) = $1 AND LOWER(network) = $2`,
    [address, network.toLowerCase()]
  );

  const { rows: srcRows } = await pool.query(
    `SELECT address, network, LENGTH(source_code) as source_len
     FROM contract_sources
     WHERE LOWER(address) = $1 AND LOWER(network) = $2`,
    [address, network.toLowerCase()]
  );

  if (addrRows.length === 0) {
    console.log('NOT FOUND in addresses table.');
    console.log('The contract has not been indexed. Run the scanner for this network.');
    process.exit(1);
  }

  const a = addrRows[0];
  console.log('Found in addresses:');
  console.log('  address:', a.address);
  console.log('  network:', a.network);
  console.log('  contract_name:', a.contract_name);
  console.log('  verified:', a.verified);
  console.log('  tags:', a.tags);

  if (srcRows.length === 0) {
    console.log('\nNOT FOUND in contract_sources (no source code stored).');
    console.log('The detail page requires source code. Run backfill-contract-sources if needed.');
    process.exit(1);
  }

  console.log('\nFound in contract_sources: source_code length =', srcRows[0].source_len);
  console.log('\nContract should be accessible at GET /contract/' + network + '/' + address);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
