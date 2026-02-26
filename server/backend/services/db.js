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
    await pool.query(`
      ALTER TABLE addresses ADD COLUMN IF NOT EXISTS evmbench BOOLEAN DEFAULT false
    `);
    await pool.query(`
      ALTER TABLE addresses ADD COLUMN IF NOT EXISTS getrecon BOOLEAN DEFAULT false
    `);
    await pool.query(`
      ALTER TABLE addresses ADD COLUMN IF NOT EXISTS getrecon_url TEXT
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_reports (
        id SERIAL PRIMARY KEY,
        address TEXT NOT NULL,
        network TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        report_json JSONB,
        raw_output TEXT,
        triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP
      )
    `);
    await pool.query(`
      ALTER TABLE audit_reports ADD COLUMN IF NOT EXISTS evmbench_job_id UUID
    `);
    await pool.query(`
      ALTER TABLE audit_reports ADD COLUMN IF NOT EXISTS model TEXT
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS fuzz_reports (
        id SERIAL PRIMARY KEY,
        address TEXT NOT NULL,
        network TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        report_json JSONB,
        raw_output TEXT,
        campaign_id TEXT,
        triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP
      )
    `);
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
