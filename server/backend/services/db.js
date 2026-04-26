const { Pool } = require('pg');

// Build pool config from env - use same DB as scanners when DATABASE_URL not set
function getPoolConfig() {
  let connectionString = process.env.DATABASE_URL;
  if (!connectionString && process.env.PGDATABASE) {
    const user = process.env.PGUSER || 'postgres';
    const host = process.env.PGHOST || 'localhost';
    const port = process.env.PGPORT || '5432';
    const database = process.env.PGDATABASE;
    const password = process.env.PGPASSWORD ? `:${encodeURIComponent(process.env.PGPASSWORD)}` : '';
    connectionString = `postgresql://${user}${password}@${host}:${port}/${database}`;
  }
  connectionString = connectionString || 'postgresql://postgres@localhost:5432/bugchain_indexer';
  const useSSL = String(process.env.DATABASE_SSL || '').toLowerCase() === 'true';
  const rejectUnauthorized = String(process.env.DATABASE_SSL_REJECT_UNAUTHORIZED || '').toLowerCase() !== 'false';
  const cfg = { connectionString };
  if (useSSL) cfg.ssl = { rejectUnauthorized };
  return cfg;
}

const pool = new Pool(getPoolConfig());

// Ensure tables/columns exist (scanners create them; backend may connect first)
pool.on('connect', () => {});
(async function ensureSchema() {
  try {
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
    await pool.query(`
      ALTER TABLE addresses ADD COLUMN IF NOT EXISTS native_balance NUMERIC(78, 0) DEFAULT 0
    `);
    // EVMBENCH / GetRecon-specific schema (addresses.evmbench/getrecon, audit_reports, fuzz_reports)
    // is no longer required by the simplified backend and is intentionally not created here.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS contract_bookmarks (
        id SERIAL PRIMARY KEY,
        address TEXT NOT NULL,
        network TEXT NOT NULL,
        contract_name TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(address, network)
      )
    `);
    // Audit run tracking columns. The audit-one.sh / ingest.js pipeline only
    // writes 'completed' rows on success — these columns let us track running
    // / failed runs and expose phase/log info to the dashboard.
    await pool.query(`ALTER TABLE contract_audits ADD COLUMN IF NOT EXISTS pid INTEGER`);
    await pool.query(`ALTER TABLE contract_audits ADD COLUMN IF NOT EXISTS phase TEXT`);
    await pool.query(`ALTER TABLE contract_audits ADD COLUMN IF NOT EXISTS log_path TEXT`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS github_tokens (
        user_id TEXT PRIMARY KEY,
        access_token_encrypted TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
  } catch (e) {
    console.warn('[db] schema ensure:', e.message);
  }
})();

function ensureDbUrl() {
  if (!process.env.DATABASE_URL) {
    // Set default if missing
    process.env.DATABASE_URL = 'postgresql://postgres@localhost:5432/bugchain_indexer';
  }
}

module.exports = { pool, ensureDbUrl };
