/**
 * Database Operations and Schema Management
 * Unified database utilities and indexing
 */

// ====== SCHEMA MANAGEMENT ======
async function ensureSchema(client) {
  const schemas = [
    `CREATE TABLE IF NOT EXISTS addresses (
      address TEXT NOT NULL,
      code_hash TEXT,
      contract_name TEXT,
      verified BOOLEAN NOT NULL DEFAULT false,
      is_proxy BOOLEAN NOT NULL DEFAULT false,
      implementation_address TEXT,
      proxy_contract_name TEXT,
      implementation_contract_name TEXT,
      deploy_tx_hash TEXT,
      deployer_address TEXT,
      deploy_block_number BIGINT,
      deployed_at_timestamp BIGINT,
      deployed_at TEXT,
      confidence TEXT,
      fetched_at TEXT,
      deployed BIGINT,
      last_updated BIGINT,
      network TEXT NOT NULL,
      first_seen BIGINT,
      tags TEXT[] DEFAULT '{}',
      fund NUMERIC(78, 0) DEFAULT 0,
      last_fund_updated BIGINT DEFAULT 0,
      name_checked BOOLEAN NOT NULL DEFAULT false,
      name_checked_at BIGINT NOT NULL DEFAULT 0,
      PRIMARY KEY (address, network)
    )`,
    
    // Tokens table for price tracking
    `CREATE TABLE IF NOT EXISTS tokens (
      token_address TEXT NOT NULL,
      network TEXT NOT NULL,
      name TEXT,
      symbol TEXT,
      decimals INTEGER,
      price DECIMAL(20, 8),
      price_updated BIGINT,
      is_valid BOOLEAN DEFAULT true,
      PRIMARY KEY (token_address, network)
    )`,

    // Token metadata cache table (30 day cache for token metadata)
    `CREATE TABLE IF NOT EXISTS token_metadata_cache (
      network TEXT NOT NULL,
      token_address TEXT NOT NULL,
      symbol TEXT,
      name TEXT,
      decimals INTEGER,
      logo_url TEXT,
      last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (network, token_address)
    )`,

    // Symbol prices table for token price data
    `CREATE TABLE IF NOT EXISTS symbol_prices (
      symbol VARCHAR(50) PRIMARY KEY,
      price_usd NUMERIC(20, 8) NOT NULL,
      decimals INTEGER DEFAULT 18,
      name VARCHAR(100),
      last_updated BIGINT
    )`,

    // Network log density statistics for dynamic optimization
    `CREATE TABLE IF NOT EXISTS network_log_density_stats (
      network VARCHAR(50) PRIMARY KEY,
      avg_logs_per_block DECIMAL(10, 2) NOT NULL,
      stddev_logs_per_block DECIMAL(10, 2),
      min_logs_per_block INTEGER,
      max_logs_per_block INTEGER,
      optimal_batch_size INTEGER,
      recommended_profile VARCHAR(50),
      sample_count INTEGER NOT NULL DEFAULT 0,
      total_logs_sampled BIGINT NOT NULL DEFAULT 0,
      total_blocks_sampled BIGINT NOT NULL DEFAULT 0,
      last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Essential indexes for performance - optimized for common queries
    `CREATE INDEX IF NOT EXISTS idx_addresses_network ON addresses(network)`,
    `CREATE INDEX IF NOT EXISTS idx_addresses_tags_gin ON addresses USING GIN(tags)`,
    `CREATE INDEX IF NOT EXISTS idx_addresses_fund ON addresses(network, fund)`,
    `CREATE INDEX IF NOT EXISTS idx_addresses_last_updated ON addresses(network, last_updated)`,
    `CREATE INDEX IF NOT EXISTS idx_addresses_first_seen ON addresses(network, first_seen DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_addresses_first_seen_global ON addresses(first_seen DESC NULLS LAST) WHERE (tags IS NULL OR NOT 'EOA' = ANY(tags))`,
    `CREATE INDEX IF NOT EXISTS idx_addresses_network_notags ON addresses(network) WHERE (tags IS NULL OR NOT 'EOA' = ANY(tags))`,
    `CREATE INDEX IF NOT EXISTS idx_tokens_network ON tokens(network)`,
    `CREATE INDEX IF NOT EXISTS idx_tokens_price_updated ON tokens(network, price_updated)`,
    `CREATE INDEX IF NOT EXISTS idx_token_metadata_cache_updated ON token_metadata_cache(network, last_updated)`,
    `CREATE INDEX IF NOT EXISTS idx_symbol_prices_symbol ON symbol_prices(LOWER(symbol))`,
    `CREATE INDEX IF NOT EXISTS idx_log_density_stats_updated ON network_log_density_stats(last_updated DESC)`,

    // Contract source code storage for verified contracts (code search)
    `CREATE TABLE IF NOT EXISTS contract_sources (
      address TEXT NOT NULL,
      network TEXT NOT NULL,
      source_code TEXT NOT NULL,
      source_code_hash TEXT,
      compiler_version TEXT,
      optimization_used TEXT,
      runs INTEGER,
      fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (address, network),
      FOREIGN KEY (address, network) REFERENCES addresses(address, network) ON DELETE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS idx_contract_sources_network ON contract_sources(network)`,

    // ERC-20 token balances for verified contracts (Etherscan tokenbalance API)
    `CREATE TABLE IF NOT EXISTS contract_token_balances (
      address TEXT NOT NULL,
      network TEXT NOT NULL,
      token_address TEXT NOT NULL,
      symbol TEXT NOT NULL,
      decimals INTEGER NOT NULL,
      balance_wei NUMERIC(78, 0) NOT NULL,
      last_updated BIGINT NOT NULL,
      PRIMARY KEY (address, network, token_address),
      FOREIGN KEY (address, network) REFERENCES addresses(address, network) ON DELETE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS idx_ctb_network ON contract_token_balances(network)`,
    `CREATE INDEX IF NOT EXISTS idx_ctb_last_updated ON contract_token_balances(network, last_updated)`
  ];

  for (const schema of schemas) {
    try {
      await client.query(schema);
    } catch (error) {
      console.error('Schema creation failed:', error.message);
    }
  }

  // Column-type migration for existing deployments:
  // fund used to be BIGINT, which overflows on large balances (common on Ethereum).
  // NUMERIC(78,0) safely stores uint256-sized integer amounts.
  try {
    await client.query(`
      ALTER TABLE addresses ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT false;
      ALTER TABLE addresses ADD COLUMN IF NOT EXISTS is_proxy BOOLEAN NOT NULL DEFAULT false;
      ALTER TABLE addresses ADD COLUMN IF NOT EXISTS implementation_address TEXT;
      ALTER TABLE addresses ADD COLUMN IF NOT EXISTS proxy_contract_name TEXT;
      ALTER TABLE addresses ADD COLUMN IF NOT EXISTS implementation_contract_name TEXT;
      ALTER TABLE addresses ADD COLUMN IF NOT EXISTS deploy_tx_hash TEXT;
      ALTER TABLE addresses ADD COLUMN IF NOT EXISTS deployer_address TEXT;
      ALTER TABLE addresses ADD COLUMN IF NOT EXISTS deploy_block_number BIGINT;
      ALTER TABLE addresses ADD COLUMN IF NOT EXISTS deployed_at_timestamp BIGINT;
      ALTER TABLE addresses ADD COLUMN IF NOT EXISTS deployed_at TEXT;
      ALTER TABLE addresses ADD COLUMN IF NOT EXISTS confidence TEXT;
      ALTER TABLE addresses ADD COLUMN IF NOT EXISTS fetched_at TEXT;
    `);
  } catch (error) {
    console.error('Address enrichment column migration warning:', error.message);
  }
  try {
    await client.query(`
      ALTER TABLE addresses
      ALTER COLUMN fund TYPE NUMERIC(78, 0)
      USING fund::NUMERIC
    `);
  } catch (error) {
    // Ignore no-op/compatible-type errors to keep ensureSchema idempotent.
    const msg = String(error.message || '');
    if (!msg.includes('cannot be cast automatically') &&
        !msg.includes('already')) {
      console.error('Fund column migration warning:', error.message);
    }
  }
  try {
    await client.query(`
      ALTER TABLE addresses
      ALTER COLUMN fund SET DEFAULT 0
    `);
  } catch (error) {
    console.error('Fund default migration warning:', error.message);
  }
  try {
    await client.query(`
      ALTER TABLE addresses ADD COLUMN IF NOT EXISTS native_balance NUMERIC(78, 0) DEFAULT 0
    `);
  } catch (error) {
    console.error('Native balance column migration warning:', error.message);
  }

  // contract_sources column migration (abi, contract_file_name, etc.)
  try {
    await client.query(`
      ALTER TABLE contract_sources ADD COLUMN IF NOT EXISTS abi TEXT;
      ALTER TABLE contract_sources ADD COLUMN IF NOT EXISTS contract_file_name TEXT;
      ALTER TABLE contract_sources ADD COLUMN IF NOT EXISTS compiler_type TEXT;
      ALTER TABLE contract_sources ADD COLUMN IF NOT EXISTS evm_version TEXT;
      ALTER TABLE contract_sources ADD COLUMN IF NOT EXISTS constructor_arguments TEXT;
      ALTER TABLE contract_sources ADD COLUMN IF NOT EXISTS library TEXT;
      ALTER TABLE contract_sources ADD COLUMN IF NOT EXISTS license_type TEXT;
    `);
  } catch (error) {
    console.error('contract_sources column migration warning:', error.message);
  }

  // pg_trgm extension for code similarity search (may require superuser)
  try {
    await client.query('CREATE EXTENSION IF NOT EXISTS pg_trgm');
  } catch (error) {
    console.warn('pg_trgm extension not available (code search may be limited):', error.message);
  }

  // GIN index for contract source code search (create after table exists)
  try {
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_contract_sources_source_trgm
      ON contract_sources USING gin (source_code gin_trgm_ops)
    `);
  } catch (error) {
    console.warn('contract_sources trigram index creation skipped:', error.message);
  }

  console.log('Database schema ensured');
}

// ====== CONTRACT SOURCES ======
async function batchUpsertContractSources(client, sources, options = {}) {
  if (sources.length === 0) return { rowCount: 0 };

  const batchSize = options.batchSize || 50;
  let totalRowCount = 0;

  for (let i = 0; i < sources.length; i += batchSize) {
    const batch = sources.slice(i, i + batchSize);
    const values = [];
    const params = [];
    let paramIndex = 1;

    for (const s of batch) {
      if (!s.sourceCode || !s.address || !s.network) continue;
      const rowParams = [
        s.address,
        s.network,
        s.sourceCode,
        s.sourceCodeHash || null,
        s.compilerVersion || null,
        s.optimizationUsed || null,
        s.runs != null ? s.runs : null,
        s.abi || null,
        s.contractFileName || null,
        s.compilerType || null,
        s.evmVersion || null,
        s.constructorArguments || null,
        s.library || null,
        s.licenseType || null
      ];
      const placeholders = rowParams.map(() => `$${paramIndex++}`).join(', ');
      values.push(`(${placeholders})`);
      params.push(...rowParams);
    }

    if (values.length === 0) continue;

    const query = `
      INSERT INTO contract_sources (
        address, network, source_code, source_code_hash,
        compiler_version, optimization_used, runs,
        abi, contract_file_name, compiler_type, evm_version,
        constructor_arguments, library, license_type
      ) VALUES ${values.join(', ')}
      ON CONFLICT (address, network) DO UPDATE SET
        source_code = EXCLUDED.source_code,
        source_code_hash = EXCLUDED.source_code_hash,
        compiler_version = EXCLUDED.compiler_version,
        optimization_used = EXCLUDED.optimization_used,
        runs = EXCLUDED.runs,
        abi = EXCLUDED.abi,
        contract_file_name = EXCLUDED.contract_file_name,
        compiler_type = EXCLUDED.compiler_type,
        evm_version = EXCLUDED.evm_version,
        constructor_arguments = EXCLUDED.constructor_arguments,
        library = EXCLUDED.library,
        license_type = EXCLUDED.license_type,
        fetched_at = CURRENT_TIMESTAMP
    `;
    const result = await client.query(query, params);
    totalRowCount += result.rowCount;
  }

  return { rowCount: totalRowCount };
}

// ====== BASIC OPERATIONS ======
async function upsertAddress(client, data) {
  const query = `
    INSERT INTO addresses (
      address, code_hash, contract_name, verified, is_proxy, implementation_address,
      proxy_contract_name, implementation_contract_name, deploy_tx_hash, deployer_address,
      deploy_block_number, deployed_at_timestamp, deployed_at, confidence, fetched_at, deployed,
      last_updated, network, first_seen, tags,
      fund, last_fund_updated, name_checked, name_checked_at, native_balance
    ) VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10,
      $11, $12, $13, $14, $15, $16,
      $17, $18, $19, $20,
      $21, $22, $23, $24, $25
    )
    ON CONFLICT (address, network) DO UPDATE SET
      code_hash = $2,
      contract_name = $3,
      verified = $4,
      is_proxy = $5,
      implementation_address = $6,
      proxy_contract_name = $7,
      implementation_contract_name = $8,
      deploy_tx_hash = $9,
      deployer_address = $10,
      deploy_block_number = $11,
      deployed_at_timestamp = $12,
      deployed_at = $13,
      confidence = $14,
      fetched_at = $15,
      deployed = $16,
      last_updated = $17,
      first_seen = COALESCE(addresses.first_seen, $19),
      tags = CASE
        WHEN $20 IS NOT NULL AND array_length($20, 1) > 0
        THEN $20
        ELSE addresses.tags
      END,
      fund = $21,
      last_fund_updated = $22,
      name_checked = $23,
      name_checked_at = $24,
      native_balance = $25
  `;
  
  const now = Math.floor(Date.now() / 1000);
  
  return client.query(query, [
    data.address,
    data.codeHash,
    data.contractName,
    data.verified || false,
    data.isProxy || false,
    data.implementationAddress || null,
    data.proxyContractName || null,
    data.implementationContractName || null,
    data.deployTxHash || null,
    data.deployerAddress || null,
    data.deployBlockNumber || null,
    data.deployedAtTimestamp || null,
    data.deployedAt || null,
    data.confidence || null,
    data.fetchedAt || null,
    // IMPORTANT: Keep deployed as null if not provided or invalid
    // Never use current time as default for deployed field
    (data.deployed && data.deployed > 0) ? data.deployed : null,
    data.lastUpdated || now,
    data.network,
    data.firstSeen || now,
    data.tags || [],
    data.fund || 0,
    data.lastFundUpdated || 0,
    data.nameChecked || false,
    data.nameCheckedAt || 0,
    data.nativeBalance || 0
  ]);
}

/**
 * Update only fund-related fields (fund, last_fund_updated, native_balance).
 * Use this for FundUpdater to avoid overwriting verified, contract_name, etc.
 */
async function batchUpdateFunds(client, updates, options = {}) {
  if (updates.length === 0) return { rowCount: 0 };
  const batchSize = options.batchSize || 500;
  let totalRowCount = 0;
  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize);
    const addrs = batch.map(b => b.address);
    const nets = batch.map(b => b.network);
    const funds = batch.map(b => b.fund ?? 0);
    const lastFunds = batch.map(b => b.lastFundUpdated ?? 0);
    const natives = batch.map(b => b.nativeBalance ?? 0);
    const r = await client.query(`
      UPDATE addresses a SET
        fund = u.fund,
        last_fund_updated = u.last_fund_updated,
        native_balance = u.native_balance
      FROM (
        SELECT * FROM unnest($1::text[], $2::text[], $3::numeric[], $4::bigint[], $5::numeric[])
        AS t(addr, net, fund, last_fund_updated, native_balance)
      ) u(addr, net, fund, last_fund_updated, native_balance)
      WHERE a.address = u.addr AND a.network = u.net
    `, [addrs, nets, funds, lastFunds, natives]);
    totalRowCount += r.rowCount;
  }
  return { rowCount: totalRowCount };
}

async function batchUpsertAddresses(client, addresses, options = {}) {
  if (addresses.length === 0) {
    return { rowCount: 0 };
  }

  const batchSize = options.batchSize || 500;
  const now = Math.floor(Date.now() / 1000);
  let totalRowCount = 0;

  // DEBUG: Log first address to see what data is being passed
  if (addresses.length > 0 && addresses[0].deployed) {
    console.log('[DEBUG] batchUpsertAddresses called with sample data:', {
      address: addresses[0].address,
      deployed: addresses[0].deployed,
      deployedType: typeof addresses[0].deployed,
      codeHash: addresses[0].codeHash ? addresses[0].codeHash.substring(0, 20) : null
    });
  }

  for (let i = 0; i < addresses.length; i += batchSize) {
    const batch = addresses.slice(i, i + batchSize);

    const values = [];
    const params = [];
    let paramIndex = 1;

    for (const data of batch) {
      const rowParams = [
        data.address,
        data.codeHash || null,
        data.contractName || null,
        data.verified || false,
        data.isProxy || false,
        data.implementationAddress || null,
        data.proxyContractName || null,
        data.implementationContractName || null,
        data.deployTxHash || null,
        data.deployerAddress || null,
        data.deployBlockNumber || null,
        data.deployedAtTimestamp || null,
        data.deployedAt || null,
        data.confidence || null,
        data.fetchedAt || null,
        // IMPORTANT: Keep deployed as null if not provided or invalid
        // Never use current time as default for deployed field
        (data.deployed && data.deployed > 0) ? data.deployed : null,
        data.lastUpdated || now,
        data.network,
        data.firstSeen || now,
        data.tags || [],
        data.fund || 0,
        data.lastFundUpdated || 0,
        data.nameChecked || false,
        data.nameCheckedAt || 0,
        data.nativeBalance || 0
      ];
      
      const placeholders = rowParams.map(() => `$${paramIndex++}`).join(', ');
      values.push(`(${placeholders})`);
      params.push(...rowParams);
    }
    
    const query = `
      INSERT INTO addresses (
        address, code_hash, contract_name, verified, is_proxy, implementation_address,
        proxy_contract_name, implementation_contract_name, deploy_tx_hash, deployer_address,
        deploy_block_number, deployed_at_timestamp, deployed_at, confidence, fetched_at, deployed,
        last_updated, network, first_seen, tags,
        fund, last_fund_updated, name_checked, name_checked_at, native_balance
      ) VALUES ${values.join(', ')}
      ON CONFLICT (address, network) DO UPDATE SET
        -- Update with new value, but keep existing if new is null (protection)
        code_hash = CASE
          WHEN EXCLUDED.code_hash IS NOT NULL THEN EXCLUDED.code_hash
          ELSE addresses.code_hash
        END,
        contract_name = CASE
          WHEN EXCLUDED.contract_name IS NOT NULL THEN EXCLUDED.contract_name
          ELSE addresses.contract_name
        END,
        verified = EXCLUDED.verified,
        is_proxy = EXCLUDED.is_proxy,
        implementation_address = CASE
          WHEN EXCLUDED.implementation_address IS NOT NULL THEN EXCLUDED.implementation_address
          ELSE addresses.implementation_address
        END,
        proxy_contract_name = CASE
          WHEN EXCLUDED.proxy_contract_name IS NOT NULL THEN EXCLUDED.proxy_contract_name
          ELSE addresses.proxy_contract_name
        END,
        implementation_contract_name = CASE
          WHEN EXCLUDED.implementation_contract_name IS NOT NULL THEN EXCLUDED.implementation_contract_name
          ELSE addresses.implementation_contract_name
        END,
        deploy_tx_hash = CASE
          WHEN EXCLUDED.deploy_tx_hash IS NOT NULL THEN EXCLUDED.deploy_tx_hash
          ELSE addresses.deploy_tx_hash
        END,
        deployer_address = CASE
          WHEN EXCLUDED.deployer_address IS NOT NULL THEN EXCLUDED.deployer_address
          ELSE addresses.deployer_address
        END,
        deploy_block_number = CASE
          WHEN EXCLUDED.deploy_block_number IS NOT NULL THEN EXCLUDED.deploy_block_number
          ELSE addresses.deploy_block_number
        END,
        deployed_at_timestamp = CASE
          WHEN EXCLUDED.deployed_at_timestamp IS NOT NULL THEN EXCLUDED.deployed_at_timestamp
          ELSE addresses.deployed_at_timestamp
        END,
        deployed_at = CASE
          WHEN EXCLUDED.deployed_at IS NOT NULL THEN EXCLUDED.deployed_at
          ELSE addresses.deployed_at
        END,
        confidence = CASE
          WHEN EXCLUDED.confidence IS NOT NULL THEN EXCLUDED.confidence
          ELSE addresses.confidence
        END,
        fetched_at = CASE
          WHEN EXCLUDED.fetched_at IS NOT NULL THEN EXCLUDED.fetched_at
          ELSE addresses.fetched_at
        END,
        deployed = CASE
          WHEN EXCLUDED.deployed IS NOT NULL THEN EXCLUDED.deployed
          ELSE addresses.deployed
        END,
        last_updated = EXCLUDED.last_updated,
        first_seen = COALESCE(addresses.first_seen, EXCLUDED.first_seen),
        tags = CASE
          WHEN EXCLUDED.tags IS NOT NULL AND array_length(EXCLUDED.tags, 1) > 0
          THEN EXCLUDED.tags
          ELSE addresses.tags
        END,
        fund = EXCLUDED.fund,
        last_fund_updated = EXCLUDED.last_fund_updated,
        name_checked = EXCLUDED.name_checked,
        name_checked_at = EXCLUDED.name_checked_at,
        native_balance = EXCLUDED.native_balance
    `;
    
    const result = await client.query(query, params);
    totalRowCount += result.rowCount;
  }
  
  return { rowCount: totalRowCount };
}

// ====== PERFORMANCE OPTIMIZATION ======

// Optimized batch upsert for high-volume data
async function optimizedBatchUpsert(client, addresses, options = {}) {
  if (addresses.length === 0) return { rowCount: 0 };

  const batchSize = options.batchSize || 1000; // Increased batch size
  const now = Math.floor(Date.now() / 1000);
  let totalRowCount = 0;
  
  // Use BEGIN/COMMIT for better performance
  await client.query('BEGIN');
  
  try {
    // Disable autocommit for batch operation
    await client.query('SET autocommit = off');
    
    for (let i = 0; i < addresses.length; i += batchSize) {
      const batch = addresses.slice(i, i + batchSize);
      
      const values = [];
      const params = [];
      let paramIndex = 1;
      
      for (const data of batch) {
        const rowParams = [
          data.address,
          data.codeHash || null,
          data.contractName || null,
          data.verified || false,
          data.isProxy || false,
          data.implementationAddress || null,
          data.proxyContractName || null,
          data.implementationContractName || null,
          data.deployTxHash || null,
          data.deployerAddress || null,
          data.deployBlockNumber || null,
          data.deployedAtTimestamp || null,
          data.deployedAt || null,
          data.confidence || null,
          data.fetchedAt || null,
          data.deployed || null,
          data.lastUpdated || now,
          data.network,
          data.firstSeen || now,
          data.tags || [],
          data.fund || 0,
          data.lastFundUpdated || 0,
          data.nameChecked || false,
          data.nameCheckedAt || 0,
          data.nativeBalance || 0
        ];
        
        const placeholders = rowParams.map(() => `$${paramIndex++}`).join(',');
        values.push(`(${placeholders})`);
        params.push(...rowParams);
      }
      
      const query = `
        INSERT INTO addresses (
          address, code_hash, contract_name, verified, is_proxy, implementation_address,
          proxy_contract_name, implementation_contract_name, deploy_tx_hash, deployer_address,
          deploy_block_number, deployed_at_timestamp, deployed_at, confidence, fetched_at, deployed,
          last_updated, network, first_seen, tags,
          fund, last_fund_updated, name_checked, name_checked_at, native_balance
        ) VALUES ${values.join(',')}
        ON CONFLICT (address, network) DO UPDATE SET
          code_hash = COALESCE(EXCLUDED.code_hash, addresses.code_hash),
          contract_name = COALESCE(EXCLUDED.contract_name, addresses.contract_name),
          verified = EXCLUDED.verified,
          is_proxy = EXCLUDED.is_proxy,
          implementation_address = COALESCE(EXCLUDED.implementation_address, addresses.implementation_address),
          proxy_contract_name = COALESCE(EXCLUDED.proxy_contract_name, addresses.proxy_contract_name),
          implementation_contract_name = COALESCE(EXCLUDED.implementation_contract_name, addresses.implementation_contract_name),
          deploy_tx_hash = COALESCE(EXCLUDED.deploy_tx_hash, addresses.deploy_tx_hash),
          deployer_address = COALESCE(EXCLUDED.deployer_address, addresses.deployer_address),
          deploy_block_number = COALESCE(EXCLUDED.deploy_block_number, addresses.deploy_block_number),
          deployed_at_timestamp = COALESCE(EXCLUDED.deployed_at_timestamp, addresses.deployed_at_timestamp),
          deployed_at = COALESCE(EXCLUDED.deployed_at, addresses.deployed_at),
          confidence = COALESCE(EXCLUDED.confidence, addresses.confidence),
          fetched_at = COALESCE(EXCLUDED.fetched_at, addresses.fetched_at),
          deployed = COALESCE(EXCLUDED.deployed, addresses.deployed),
          last_updated = COALESCE(EXCLUDED.last_updated, addresses.last_updated),
          first_seen = COALESCE(EXCLUDED.first_seen, addresses.first_seen),
          tags = CASE
            WHEN EXCLUDED.tags IS NOT NULL AND array_length(EXCLUDED.tags, 1) > 0
            THEN EXCLUDED.tags
            ELSE COALESCE(addresses.tags, EXCLUDED.tags)
          END,
          fund = COALESCE(EXCLUDED.fund, addresses.fund),
          last_fund_updated = COALESCE(EXCLUDED.last_fund_updated, addresses.last_fund_updated),
          name_checked = COALESCE(EXCLUDED.name_checked, addresses.name_checked),
          name_checked_at = COALESCE(EXCLUDED.name_checked_at, addresses.name_checked_at),
          native_balance = EXCLUDED.native_balance
      `;
      
      const result = await client.query(query, params);
      totalRowCount += result.rowCount;
    }
    
    await client.query('COMMIT');
    return { rowCount: totalRowCount };
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

// Database maintenance and optimization
async function optimizeDatabase(client, options = {}) {
  const { skipVacuum = false, verbose = true } = options;
  
  if (verbose) console.log('🔧 Starting database optimization...');
  
  try {
    // Quick statistics update (always safe and fast)
    await client.query('ANALYZE addresses');
    if (verbose) console.log('✅ Table statistics updated (fast)');
    
    if (!skipVacuum) {
      // Check if VACUUM is needed first
      const vacuumCheck = await client.query(`
        SELECT 
          schemaname, relname as tablename, n_dead_tup, n_live_tup,
          ROUND(n_dead_tup * 100.0 / GREATEST(n_live_tup + n_dead_tup, 1), 2) as dead_ratio
        FROM pg_stat_user_tables 
        WHERE relname = 'addresses'
      `);
      
      if (vacuumCheck.rows.length > 0) {
        const stats = vacuumCheck.rows[0];
        const deadRatio = parseFloat(stats.dead_ratio);
        
        if (verbose) {
          console.log(`📊 Table stats: ${stats.n_live_tup} live, ${stats.n_dead_tup} dead (${deadRatio}% dead)`);
        }
        
        if (deadRatio > 5) {  // Only vacuum if >5% dead tuples
          if (verbose) console.log('🧹 Running VACUUM (this may take several minutes)...');
          const startTime = Date.now();
          
          await client.query('VACUUM ANALYZE addresses');
          
          const duration = Math.round((Date.now() - startTime) / 1000);
          if (verbose) console.log(`✅ Table vacuumed and analyzed (${duration}s)`);
        } else {
          if (verbose) console.log('ℹ️  VACUUM skipped - table is clean (dead ratio < 5%)');
        }
      }
    } else {
      if (verbose) console.log('ℹ️  VACUUM skipped by option');
    }
    
    // Update query planner statistics (lightweight)
    await client.query("SELECT pg_stat_reset()");
    if (verbose) console.log('✅ Query statistics reset');
    
    return true;
  } catch (error) {
    console.error('❌ Database optimization failed:', error.message);
    return false;
  }
}

// Check query performance and suggest optimizations
async function analyzeQueryPerformance(client, sampleQueries = []) {
  console.log('📊 Analyzing query performance...');
  
  const defaultQueries = [
    // Common DataRevalidator query (optimized with parameterization)
    {
      sql: `EXPLAIN ANALYZE SELECT COUNT(*) FROM addresses WHERE network = $1 AND (tags IS NULL OR tags = '{}' OR NOT ('Contract' = ANY(tags)) AND NOT ('EOA' = ANY(tags)))`,
      params: ['ethereum'],
      description: 'DataRevalidator tag check query'
    },
    // Common FundUpdater query (optimized with parameterization)  
    {
      sql: `EXPLAIN ANALYZE SELECT COUNT(*) FROM addresses WHERE network = $1 AND (last_fund_updated IS NULL OR last_fund_updated < $2)`,
      params: ['ethereum', Math.floor(Date.now() / 1000) - 604800],
      description: 'FundUpdater staleness check query'
    },
    // Common UnifiedScanner query (optimized with parameterization)
    {
      sql: `EXPLAIN ANALYZE SELECT COUNT(*) FROM addresses WHERE network = $1 AND last_updated > $2`,
      params: ['ethereum', Math.floor(Date.now() / 1000) - 14400],
      description: 'UnifiedScanner recent activity query'
    }
  ];
  
  const queries = [...defaultQueries, ...sampleQueries];
  
  for (const query of queries) {
    try {
      // Handle both old string format and new object format
      const queryObj = typeof query === 'string' 
        ? { sql: query, params: [], description: 'Legacy query' }
        : query;
      
      console.log(`\n🔍 Query: ${queryObj.description || 'Analyzing query'}...`);
      const displaySql = queryObj.sql.replace('EXPLAIN ANALYZE ', '').substring(0, 100);
      console.log(`   ${displaySql}...`);
      
      const result = await client.query(queryObj.sql, queryObj.params || []);
      
      // Parse execution plan for slow operations
      const plan = result.rows.map(row => row['QUERY PLAN']).join('\n');
      
      if (plan.includes('Seq Scan')) {
        console.log('⚠️  Sequential scan detected - consider adding indexes');
      }
      
      const executionTime = plan.match(/Execution Time: ([\d.]+) ms/);
      if (executionTime && parseFloat(executionTime[1]) > 1000) {
        console.log(`🐌 Slow query detected: ${executionTime[1]}ms`);
      }
      
    } catch (error) {
      console.error(`❌ Query analysis failed: ${error.message}`);
    }
  }
}

async function ensureIndexesExist(client, options = {}) {
  const { verbose = false, skipOnError = true } = options;
  
  const results = {
    created: [],
    failed: [],
    skipped: []
  };
  
  for (const [tableName, indexes] of Object.entries(INDEXES)) {
    if (verbose) {
      console.log(`Ensuring indexes for table: ${tableName}`);
    }
    
    for (const index of indexes) {
      try {
        const startTime = Date.now();
        await client.query(index.sql);
        const duration = Date.now() - startTime;
        
        results.created.push({
          name: index.name,
          table: tableName,
          duration,
          description: index.description
        });
        
        if (verbose) {
          console.log(`✅ Index ${index.name} ensured in ${duration}ms`);
        }
      } catch (error) {
        const errorInfo = {
          name: index.name,
          table: tableName,
          error: error.message,
          description: index.description
        };
        
        if (skipOnError) {
          results.failed.push(errorInfo);
          if (verbose) {
            console.warn(`⚠️  Index ${index.name} failed: ${error.message}`);
          }
        } else {
          throw new Error(`Failed to create index ${index.name}: ${error.message}`);
        }
      }
    }
  }
  
  if (verbose) {
    console.log(`Index creation summary:`);
    console.log(`  Created/Verified: ${results.created.length}`);
    console.log(`  Failed: ${results.failed.length}`);
    console.log(`  Skipped: ${results.skipped.length}`);
  }
  
  return results;
}

async function getIndexStats(client, options = {}) {
  const { tableName = 'addresses', verbose = false } = options;
  
  try {
    // Get table size
    const tableSizeQuery = `
      SELECT 
        pg_size_pretty(pg_total_relation_size($1)) as table_size,
        pg_size_pretty(pg_relation_size($1)) as data_size,
        pg_size_pretty(pg_total_relation_size($1) - pg_relation_size($1)) as index_size
    `;
    
    const tableSizeResult = await client.query(tableSizeQuery, [tableName]);
    const sizes = tableSizeResult.rows[0];
    
    // Get index information
    const indexQuery = `
      SELECT 
        i.relname as index_name,
        pg_size_pretty(pg_relation_size(i.oid)) as index_size,
        idx_stat.idx_scan as scans,
        idx_stat.idx_tup_read as tuples_read,
        idx_stat.idx_tup_fetch as tuples_fetched,
        am.amname as method
      FROM pg_class t
      JOIN pg_index ix ON t.oid = ix.indrelid
      JOIN pg_class i ON i.oid = ix.indexrelid
      LEFT JOIN pg_stat_user_indexes idx_stat ON idx_stat.indexrelid = i.oid
      LEFT JOIN pg_am am ON i.relam = am.oid
      WHERE t.relname = $1
      AND t.relkind = 'r'
      ORDER BY pg_relation_size(i.oid) DESC
    `;
    
    const indexResult = await client.query(indexQuery, [tableName]);
    
    const stats = {
      table: tableName,
      sizes,
      indexes: indexResult.rows,
      summary: {
        total_indexes: indexResult.rows.length,
        total_scans: indexResult.rows.reduce((sum, idx) => sum + (idx.scans || 0), 0),
        total_tuples_read: indexResult.rows.reduce((sum, idx) => sum + (idx.tuples_read || 0), 0)
      }
    };
    
    if (verbose) {
      console.log(`\nTable Statistics for ${tableName}:`);
      console.log(`  Total Size: ${sizes.table_size}`);
      console.log(`  Data Size: ${sizes.data_size}`);
      console.log(`  Index Size: ${sizes.index_size}`);
      console.log(`  Total Indexes: ${stats.summary.total_indexes}`);
      
      console.log(`\nIndex Details:`);
      stats.indexes.forEach(idx => {
        console.log(`  ${idx.index_name} (${idx.method}):`);
        console.log(`    Size: ${idx.index_size}`);
        console.log(`    Scans: ${idx.scans || 0}`);
        console.log(`    Tuples Read: ${idx.tuples_read || 0}`);
        console.log(`    Tuples Fetched: ${idx.tuples_fetched || 0}`);
        console.log('');
      });
    }
    
    return stats;
  } catch (error) {
    throw new Error(`Failed to get index stats for ${tableName}: ${error.message}`);
  }
}

// ====== QUERY HELPERS ======
async function findAddressesByNetwork(client, network, options = {}) {
  const {
    limit = 1000,
    offset = 0,
    deployed = null,
    nameChecked = null,
    orderBy = 'last_updated',
    orderDirection = 'DESC'
  } = options;
  
  let whereConditions = ['network = $1'];
  let params = [network];
  let paramIndex = 2;
  
  if (deployed !== null) {
    if (deployed === 'contract') {
      whereConditions.push(`deployed > 0`);
    } else if (deployed === 'eoa') {
      whereConditions.push(`deployed = 0`);
    }
  }
  
  if (nameChecked !== null) {
    whereConditions.push(`name_checked = $${paramIndex}`);
    params.push(nameChecked);
    paramIndex++;
  }
  
  const query = `
    SELECT * FROM addresses 
    WHERE ${whereConditions.join(' AND ')}
    ORDER BY ${orderBy} ${orderDirection}
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;
  
  params.push(limit, offset);
  
  const result = await client.query(query, params);
  return result.rows;
}

async function findAddressesNeedingVerification(client, network, options = {}) {
  const {
    limit = 100,
    minDeployTime = null,
    maxAge = 7 * 24 * 60 * 60 // 7 days in seconds
  } = options;
  
  const currentTime = Math.floor(Date.now() / 1000);
  const cutoffTime = currentTime - maxAge;
  
  let whereConditions = [
    'network = $1',
    'deployed > 0', // Only contracts
    'name_checked = false',
    `(name_checked_at = 0 OR name_checked_at < $2)` // Never checked or checked long ago
  ];
  
  let params = [network, cutoffTime];
  let paramIndex = 3;
  
  if (minDeployTime) {
    whereConditions.push(`deployed >= $${paramIndex}`);
    params.push(minDeployTime);
    paramIndex++;
  }
  
  const query = `
    SELECT address, deployed, name_checked_at, contract_name
    FROM addresses 
    WHERE ${whereConditions.join(' AND ')}
    ORDER BY deployed DESC
    LIMIT $${paramIndex}
  `;
  
  params.push(limit);
  
  const result = await client.query(query, params);
  return result.rows;
}

async function getNetworkStats(client, network) {
  const query = `
    SELECT 
      COUNT(*) as total_addresses,
      COUNT(*) FILTER (WHERE deployed > 0) as contracts,
      COUNT(*) FILTER (WHERE deployed = 0) as eoas,
      COUNT(*) FILTER (WHERE name_checked = true AND deployed > 0) as verified_contracts,
      COUNT(*) FILTER (WHERE contract_name IS NOT NULL) as named_contracts,
      MAX(last_updated) as latest_update,
      MIN(first_seen) as earliest_seen
    FROM addresses 
    WHERE network = $1
  `;
  
  const result = await client.query(query, [network]);
  const stats = result.rows[0];
  
  // Convert counts to numbers
  Object.keys(stats).forEach(key => {
    if (key !== 'latest_update' && key !== 'earliest_seen') {
      stats[key] = parseInt(stats[key]);
    }
  });
  
  return stats;
}

// ====== PREPARED STATEMENT HELPERS ======

/**
 * Prepared statement cache for frequently used queries
 */
class PreparedStatementManager {
  constructor() {
    this.statements = new Map();
    this.cache = new Map();
  }
  
  /**
   * Execute a prepared statement with caching
   * @param {object} client - Database client
   * @param {string} name - Statement name
   * @param {string} sql - SQL query with $1, $2, etc.
   * @param {array} params - Parameters for the query
   */
  async execute(client, name, sql, params = []) {
    // Use statement caching for better performance
    const cacheKey = `${name}_${sql}`;
    if (!this.cache.has(cacheKey)) {
      this.cache.set(cacheKey, { sql, lastUsed: Date.now() });
    }
    
    this.cache.get(cacheKey).lastUsed = Date.now();
    
    return client.query(sql, params);
  }
  
  /**
   * Clean up old cached statements (call periodically)
   */
  cleanup(maxAge = 3600000) { // 1 hour default
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.lastUsed > maxAge) {
        this.cache.delete(key);
      }
    }
  }
}

// Global prepared statement manager
const preparedStatements = new PreparedStatementManager();

/**
 * Common prepared statements for frequently used queries
 */
const PREPARED_QUERIES = {
  // DataRevalidator queries
  GET_ADDRESSES_NEEDING_REVALIDATION: `
    SELECT address, network, deployed, code_hash, contract_name, tags
    FROM addresses 
    WHERE network = $1 
    AND (tags IS NULL OR tags = '{}' OR NOT ('Contract' = ANY(tags)) AND NOT ('EOA' = ANY(tags)))
    ORDER BY last_updated ASC NULLS FIRST
    LIMIT $2
  `,
  
  // FundUpdater queries  
  GET_ADDRESSES_NEEDING_FUND_UPDATE: `
    SELECT address FROM addresses
    WHERE (last_fund_updated IS NULL OR last_fund_updated < $1)
    AND network = $2
    AND code_hash IS NOT NULL 
    AND code_hash != $3
    AND code_hash != ''
    AND (tags IS NULL OR NOT ('EOA' = ANY(tags)))
    ORDER BY last_fund_updated ASC NULLS FIRST
    LIMIT $4
  `,
  
  // UnifiedScanner queries
  CHECK_EXISTING_ADDRESSES: `
    SELECT address FROM addresses 
    WHERE address = ANY($1) AND network = $2
  `,
  
  // Performance test queries
  COUNT_ADDRESSES_BY_NETWORK: `
    SELECT COUNT(*) FROM addresses WHERE network = $1
  `,
  
  COUNT_CONTRACTS_BY_NETWORK: `
    SELECT COUNT(*) FROM addresses 
    WHERE network = $1 AND 'Contract' = ANY(tags)
  `
};

/**
 * Execute a prepared query with performance optimization
 * @param {object} client - Database client  
 * @param {string} queryName - Name from PREPARED_QUERIES
 * @param {array} params - Query parameters
 */
async function executePreparedQuery(client, queryName, params = []) {
  if (!PREPARED_QUERIES[queryName]) {
    throw new Error(`Unknown prepared query: ${queryName}`);
  }
  
  return preparedStatements.execute(
    client, 
    queryName, 
    PREPARED_QUERIES[queryName], 
    params
  );
}

// ====== TOKEN MANAGEMENT ======
async function loadTokensFromFile(client, network) {
  const fs = require('fs');
  const path = require('path');
  
  const tokensDir = path.join(__dirname, '..', 'tokens');
  const filePath = path.join(tokensDir, `${network}.json`);
  
  if (!fs.existsSync(filePath)) {
    return 0; // No token file for this network
  }

  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const tokens = data.tokens || [];
    
    let loaded = 0;
    
    for (const token of tokens) {
      try {
        // Normalize address
        const address = token.address.toLowerCase();
        
        // Extract symbol from name if possible
        let symbol = token.symbol;
        if (!symbol && token.name) {
          // Try to extract symbol from name (e.g., "USD Coin (USDC)" -> "USDC")
          const match = token.name.match(/\(([A-Z0-9]+)\)$/);
          symbol = match ? match[1] : token.name.split(' ')[0];
        }
        symbol = symbol || 'UNKNOWN';
        
        // Insert or update token
        await client.query(`
          INSERT INTO tokens (token_address, network, symbol, name, decimals, is_valid)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (token_address, network) 
          DO UPDATE SET 
            symbol = EXCLUDED.symbol,
            name = EXCLUDED.name,
            decimals = EXCLUDED.decimals,
            is_valid = EXCLUDED.is_valid
        `, [
          address,
          network,
          symbol.substring(0, 20), // Limit symbol length
          token.name.substring(0, 255), // Limit name length  
          token.decimals || 18, // Default to 18 decimals
          true
        ]);
        
        loaded++;
        
      } catch (error) {
        // Skip individual token errors silently
        console.log(`⚠️ Failed to load token ${token.address}: ${error.message}`);
      }
    }
    
    return loaded;
    
  } catch (error) {
    console.log(`❌ Error reading tokens for ${network}: ${error.message}`);
    return 0;
  }
}

async function getTokenStats(client, network = null) {
  try {
    let query = `
      SELECT 
        network,
        COUNT(*) as total_tokens,
        COUNT(CASE WHEN price IS NOT NULL THEN 1 END) as tokens_with_price,
        MAX(price_updated) as last_price_update
      FROM tokens
    `;
    
    const params = [];
    if (network) {
      query += ` WHERE network = $1`;
      params.push(network);
    }
    
    query += ` GROUP BY network ORDER BY network`;
    
    const result = await client.query(query, params);
    return result.rows;
    
  } catch (error) {
    console.log(`❌ Error getting token stats: ${error.message}`);
    return [];
  }
}

// ====== EXPORTS ======
module.exports = {
  // Schema management
  ensureSchema,

  // Basic operations
  batchUpsertAddresses,
  batchUpdateFunds,
  batchUpsertContractSources,
  optimizedBatchUpsert,
  
  // Index management
  ensureIndexesExist,
  getIndexStats,
  
  // Performance optimization
  optimizeDatabase,
  analyzeQueryPerformance,
  
  // Prepared statements
  PreparedStatementManager,
  PREPARED_QUERIES,
  executePreparedQuery,
  preparedStatements,
  
  // Token management
  loadTokensFromFile,
  getTokenStats
};
