#!/usr/bin/env node
/**
 * Test addContract: delete contract if exists, then add it via API
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config({ path: path.join(__dirname, '../../../scanners/.env') });

const { Pool } = require('pg');
const TEST_ADDRESS = '0xa428723ee8ffd87088c36121d72100b43f11fb6a';
const TEST_NETWORK = 'ethereum';

function getPoolConfig() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres@localhost:5432/bugchain_indexer';
  return { connectionString };
}

async function deleteContract(pool) {
  const client = await pool.connect();
  try {
    const r = await client.query('DELETE FROM addresses WHERE address = $1 AND network = $2', [TEST_ADDRESS, TEST_NETWORK]);
    const deleted = r.rowCount || 0;
    if (deleted > 0) {
      console.log(`Deleted contract ${TEST_ADDRESS} from DB (${deleted} rows)`);
    } else {
      console.log('Contract not in DB, nothing to delete');
    }
  } finally {
    client.release();
  }
}

async function testAddContract() {
  const baseUrl = process.env.API_URL || 'http://localhost:8000';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);

  try {
    const resp = await fetch(`${baseUrl}/addContract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: TEST_ADDRESS, network: TEST_NETWORK }),
      signal: controller.signal,
    });
    const data = await resp.json();
    clearTimeout(timeout);
    return { ok: resp.ok, status: resp.status, data };
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

async function main() {
  const pool = new Pool(getPoolConfig());
  try {
    console.log('Step 1: Delete contract if exists...');
    await deleteContract(pool);
    console.log('Step 2: Call addContract API...');
    const result = await testAddContract();
    console.log('Response:', JSON.stringify(result, null, 2));
    if (result.ok && result.data?.ok) {
      console.log('\n✅ SUCCESS: Contract added successfully');
      console.log('Contract:', result.data.contract);
    } else {
      console.log('\n❌ FAILED:', result.data?.error || `HTTP ${result.status}`);
      process.exit(1);
    }
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
