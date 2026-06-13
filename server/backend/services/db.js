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

function quoteIdent(identifier) {
  return `"${String(identifier).replace(/"/g, '""')}"`;
}

async function tableExists(table) {
  const result = await pool.query('SELECT to_regclass($1) IS NOT NULL AS exists', [`public.${table}`]);
  return Boolean(result.rows[0]?.exists);
}

async function columnExists(table, column) {
  const result = await pool.query(
    `
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
        AND column_name = $2
      LIMIT 1
    `,
    [table, column]
  );
  return result.rowCount > 0;
}

async function constraintExists(constraintName) {
  const result = await pool.query(
    `
      SELECT 1
      FROM pg_constraint
      WHERE conname = $1
      LIMIT 1
    `,
    [constraintName]
  );
  return result.rowCount > 0;
}

async function addColumnIfMissing(table, column, definition) {
  if (await columnExists(table, column)) return;
  await pool.query(`ALTER TABLE ${quoteIdent(table)} ADD COLUMN ${quoteIdent(column)} ${definition}`);
}

// Ensure tables/columns exist (scanners create them; backend may connect first)
pool.on('connect', () => {});
(async function ensureSchema() {
  try {
    if (!(await tableExists('contract_token_balances'))) {
      await pool.query(`
        CREATE TABLE contract_token_balances (
          address TEXT NOT NULL,
          network TEXT NOT NULL,
          token_address TEXT NOT NULL,
          symbol TEXT NOT NULL,
          decimals INTEGER NOT NULL,
          balance_wei NUMERIC(78, 0) NOT NULL,
          price_usd NUMERIC(30, 8),
          value_usd NUMERIC(30, 8),
          last_updated BIGINT NOT NULL,
          PRIMARY KEY (address, network, token_address)
        )
      `);
    }
    if (await tableExists('addresses')) {
      await addColumnIfMissing('addresses', 'native_balance', 'NUMERIC(78, 0) DEFAULT 0');
      await addColumnIfMissing('addresses', 'fund_usd', 'NUMERIC(30, 8) DEFAULT 0');
    }
    await addColumnIfMissing('contract_token_balances', 'price_usd', 'NUMERIC(30, 8)');
    await addColumnIfMissing('contract_token_balances', 'value_usd', 'NUMERIC(30, 8)');
    // EVMBENCH / GetRecon-specific schema (addresses.evmbench/getrecon, audit_reports, fuzz_reports)
    // is no longer required by the simplified backend and is intentionally not created here.
    if (!(await tableExists('contract_bookmarks'))) {
      await pool.query(`
        CREATE TABLE contract_bookmarks (
          id SERIAL PRIMARY KEY,
          user_id TEXT NOT NULL DEFAULT '0xmilenov',
          address TEXT NOT NULL,
          network TEXT NOT NULL,
          contract_name TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT contract_bookmarks_user_address_network_key UNIQUE(user_id, address, network)
        )
      `);
    }
    await addColumnIfMissing('contract_bookmarks', 'user_id', "TEXT NOT NULL DEFAULT '0xmilenov'");
    if (await constraintExists('contract_bookmarks_address_network_key')) {
      await pool.query('ALTER TABLE contract_bookmarks DROP CONSTRAINT contract_bookmarks_address_network_key');
    }
    if (!(await constraintExists('contract_bookmarks_user_address_network_key'))) {
      await pool.query(`
        ALTER TABLE contract_bookmarks
        ADD CONSTRAINT contract_bookmarks_user_address_network_key
        UNIQUE (user_id, address, network)
      `);
    }
    // Audit run tracking columns. The audit-one.sh / ingest.js pipeline only
    // writes 'completed' rows on success — these columns let us track running
    // / failed runs and expose phase/log info to the dashboard.
    if (await tableExists('contract_audits')) {
      await addColumnIfMissing('contract_audits', 'pid', 'INTEGER');
      await addColumnIfMissing('contract_audits', 'phase', 'TEXT');
      await addColumnIfMissing('contract_audits', 'log_path', 'TEXT');
      await addColumnIfMissing('contract_audits', 'low_count', 'INTEGER NOT NULL DEFAULT 0');
      await addColumnIfMissing('contract_audits', 'informational_count', 'INTEGER NOT NULL DEFAULT 0');
    }
    if (await tableExists('contract_audit_findings')) {
      await addColumnIfMissing('contract_audit_findings', 'original_severity', 'TEXT');
      await addColumnIfMissing('contract_audit_findings', 'evidence_tag', 'TEXT');
      await addColumnIfMissing('contract_audit_findings', 'evidence_tags', "TEXT[] DEFAULT '{}'");
      await addColumnIfMissing('contract_audit_findings', 'verification_status', 'TEXT');
      await addColumnIfMissing('contract_audit_findings', 'report_id', 'TEXT');
      await addColumnIfMissing('contract_audit_findings', 'source_finding_id', 'TEXT');
      await addColumnIfMissing('contract_audit_findings', 'trust_adjustment', 'TEXT');
      await pool.query(`
        DO $$
        DECLARE c record;
        BEGIN
          FOR c IN
            SELECT conname
            FROM pg_constraint
            WHERE conrelid = 'contract_audit_findings'::regclass
              AND contype = 'c'
              AND pg_get_constraintdef(oid) ILIKE '%severity%'
          LOOP
            EXECUTE format('ALTER TABLE contract_audit_findings DROP CONSTRAINT %I', c.conname);
          END LOOP;
          ALTER TABLE contract_audit_findings
            ADD CONSTRAINT contract_audit_findings_severity_check
            CHECK (severity IN ('critical','high','medium','low','informational'));
        END $$;
      `);
    }
    if (!(await tableExists('local_users'))) {
      await pool.query(`
        CREATE TABLE local_users (
          username TEXT PRIMARY KEY,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'user',
          disabled BOOLEAN NOT NULL DEFAULT false,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
    }
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
