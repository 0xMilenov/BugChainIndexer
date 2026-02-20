const { pool, ensureDbUrl } = require('./db');
const redis = require('redis');
const crypto = require('crypto');

// Redis client for caching
let redisClient = null;
let redisConnected = false;

// Initialize Redis connection
(async () => {
  try {
    redisClient = redis.createClient({
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379')
      },
      password: process.env.REDIS_PASSWORD || undefined,
    });

    redisClient.on('error', (err) => {
      console.error('Redis client error:', err);
      redisConnected = false;
    });

    redisClient.on('connect', () => {
      console.log('Redis connected for count caching');
      redisConnected = true;
    });

    await redisClient.connect();
  } catch (error) {
    console.warn('Redis not available for count caching, using DB only:', error.message);
    redisConnected = false;
  }
})();

// Base filter: only verified contracts that have source code (exclude EOAs, unverified, and those without source)
const CONTRACT_LIST_WHERE = `(tags IS NULL OR NOT 'EOA' = ANY(tags)) AND verified = true AND EXISTS (SELECT 1 FROM contract_sources cs WHERE cs.address = addresses.address AND cs.network = addresses.network)`;

exports.getContractCount = async () => {
  ensureDbUrl();
  const result = await pool.query(`
    SELECT COUNT(*) as count
    FROM addresses
    WHERE ${CONTRACT_LIST_WHERE}
  `);
  return { result: result.rows };
}

/** Get total and verified contract counts (optionally per network). */
exports.getVerifiedContractStats = async (byNetwork = false) => {
  ensureDbUrl();
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
    const totals = rows.reduce(
      (acc, r) => ({
        total: acc.total + Number(r.total),
        verified: acc.verified + Number(r.verified),
      }),
      { total: 0, verified: 0 }
    );
    return { totals, byNetwork: rows };
  }
  const { rows } = await pool.query(`
    SELECT
      COUNT(*)::bigint AS total,
      COUNT(*) FILTER (WHERE verified = true)::bigint AS verified
    FROM addresses
    WHERE ${baseWhere}
  `);
  const r = rows[0];
  return {
    total: Number(r.total),
    verified: Number(r.verified),
    unverified: Number(r.total) - Number(r.verified),
  };
}

// Generate cache key for count queries
function getCountCacheKey(filters, hideUnnamed) {
  const { deployedFrom, deployedTo, fundFrom, fundTo, networks, tags, address, contractName } = filters;

  const cacheKeyObj = {
    hideUnnamed,
    deployedFrom: deployedFrom ?? null,
    deployedTo: deployedTo ?? null,
    fundFrom: fundFrom ?? null,
    fundTo: fundTo ?? null,
    networks: networks ? [...networks].sort() : null,
    tags: tags ? [...tags].sort() : null,
    address: address ?? null,
    contractName: contractName ?? null,
  };

  const keyStr = JSON.stringify(cacheKeyObj);
  const hash = crypto.createHash('sha256').update(keyStr).digest('hex').substring(0, 16);

  return `addresses:count:${hash}`;
}

// Perform exact count only when includeTotal=true
exports.getAddressesByFilter = async (filters = {}) => {
  ensureDbUrl();
  const { limit = 50, includeTotal = false, sortBy = 'fund', hideUnnamed = false, ...rest } = filters;

  // Convert fund filter (USD) to native_balance filter (wei) for consistent behavior
  let restForWhere = { ...rest };
  if (rest.fundFrom != null || rest.fundTo != null) {
    const prices = await exports.getNativePrices();
    const nets = rest.networks?.length ? rest.networks : ['ethereum', 'binance', 'optimism', 'base', 'arbitrum', 'polygon', 'avalanche', 'gnosis', 'linea', 'scroll', 'mantle', 'megaeth'];
    const filterParams = [];
    const conditions = [];
    let paramIdx = 1;
    for (const net of nets) {
      const price = prices[net];
      if (!price || price <= 0) continue;
      const fromWei = rest.fundFrom != null ? Math.floor((rest.fundFrom / price) * 1e18) : null;
      const toWei = rest.fundTo != null ? Math.ceil((rest.fundTo / price) * 1e18) : null;
      const parts = [];
      if (fromWei != null) {
        filterParams.push(fromWei);
        parts.push(`COALESCE(native_balance, 0) >= $${paramIdx++}`);
      }
      if (toWei != null) {
        filterParams.push(toWei);
        parts.push(`COALESCE(native_balance, 0) < $${paramIdx++}`);
      }
      if (parts.length) {
        filterParams.push(net.toLowerCase());
        conditions.push(`(LOWER(network) = $${paramIdx++} AND ${parts.join(' AND ')})`);
      }
    }
    if (conditions.length) {
      restForWhere = { ...rest, fundFrom: null, fundTo: null, nativeBalanceFilter: { sql: `(${conditions.join(' OR ')})`, params: filterParams } };
    }
  }

  const { whereSql, params, whereSqlNoCursor, paramsNoCursor } = buildWhere(restForWhere, sortBy);

  const take = Math.min(Math.max(+limit || 50, 1), 200);

  // Determine ORDER BY clause based on sortBy parameter
  // Use native_balance (wei) for fund sort - fund column has mixed semantics (wei from UnifiedScanner, USD from FundUpdater)
  let orderByClause;
  if (sortBy === 'first_seen') {
    orderByClause = 'ORDER BY first_seen DESC NULLS LAST, address ASC';
  } else {
    // Sort by native balance (consistent wei values) to show contracts with most native balance first
    orderByClause = 'ORDER BY COALESCE(native_balance, 0)::numeric DESC NULLS LAST, deployed DESC NULLS LAST, address ASC';
  }

  // Build SQL based on hideUnnamed flag (only verified contracts)
  let dataSql;
  const selectColumns = `
      address, contract_name, deployed, fund, native_balance, network, first_seen,
      verified, is_proxy, implementation_address, proxy_contract_name,
      implementation_contract_name, deploy_tx_hash, deployer_address,
      deploy_block_number, deployed_at_timestamp, deployed_at, confidence, fetched_at,
      COALESCE(evmbench, false) AS evmbench, COALESCE(getrecon, false) AS getrecon
  `;
  if (hideUnnamed) {
    // Use DISTINCT ON directly from addresses so enrichment columns are available.
    dataSql = `
      SELECT ${selectColumns}
      FROM (
        SELECT DISTINCT ON (contract_name)
          ${selectColumns}
        FROM addresses
        WHERE
          ${CONTRACT_LIST_WHERE}
          AND contract_name IS NOT NULL
          AND BTRIM(contract_name) != ''
          ${whereSql ? 'AND ' + whereSql.replace('WHERE ', '') : ''}
        ORDER BY contract_name, first_seen DESC NULLS LAST
      ) AS deduped_contracts
      ${orderByClause}
      LIMIT ${take + 1}
    `;
  } else {
    dataSql = `
      SELECT ${selectColumns}
      FROM addresses
      WHERE
        ${CONTRACT_LIST_WHERE}
        ${whereSql ? 'AND ' + whereSql.replace('WHERE ', '') : ''}
      ${orderByClause}
      LIMIT ${take + 1}
    `;
  }

  const dataPromise = pool.query(dataSql, params);

  // Optimize count query: use cached network counts when possible
  let countPromise;
  if (includeTotal) {
    const hasOnlyNetworkFilter = rest.networks?.length > 0
      && !rest.address && !rest.contractName
      && !rest.deployedFrom && !rest.deployedTo
      && !rest.fundFrom && !rest.fundTo
      && !hideUnnamed;

    if (hasOnlyNetworkFilter) {
      // Fast path: sum cached network counts
      countPromise = (async () => {
        const networkCounts = await exports.getNetworkCounts();
        const total = rest.networks.reduce((sum, net) => sum + (networkCounts[net] || 0), 0);
        return { rows: [{ total: BigInt(total) }] };
      })();
    } else {
      // Try Redis cache first
      const cacheKey = getCountCacheKey(rest, hideUnnamed);

      countPromise = (async () => {
        // Check Redis cache
        if (redisConnected && redisClient) {
          try {
            const cachedCount = await redisClient.get(cacheKey);
            if (cachedCount !== null) {
              console.log(`[Cache HIT] Count cached for key: ${cacheKey}`);
              return { rows: [{ total: BigInt(cachedCount) }] };
            }
            console.log(`[Cache MISS] Fetching count from DB for key: ${cacheKey}`);
          } catch (err) {
            console.error('Redis get error:', err);
          }
        }

        // Cache miss or Redis unavailable - query database
        let countSql;
        if (hideUnnamed) {
          // Count unique named contracts after filters.
          countSql = `
            SELECT COUNT(*)::bigint AS total
            FROM (
              SELECT DISTINCT ON (contract_name)
                contract_name
              FROM addresses
              WHERE
                ${CONTRACT_LIST_WHERE}
                AND contract_name IS NOT NULL
                AND BTRIM(contract_name) != ''
                ${whereSqlNoCursor ? 'AND ' + whereSqlNoCursor.replace('WHERE ', '') : ''}
              ORDER BY contract_name, first_seen DESC NULLS LAST
            ) AS deduped_contracts
          `;
        } else {
          // Count all matching addresses (verified only)
          countSql = `
            SELECT COUNT(*)::bigint AS total
            FROM addresses
            WHERE ${CONTRACT_LIST_WHERE}
              ${whereSqlNoCursor ? 'AND ' + whereSqlNoCursor.replace('WHERE ', '') : ''}
          `;
        }

        const result = await pool.query(countSql, paramsNoCursor);

        // Store in Redis cache (TTL: 5 minutes)
        if (redisConnected && redisClient && result.rows[0]?.total != null) {
          try {
            await redisClient.setEx(cacheKey, 300, result.rows[0].total.toString());
            console.log(`[Cache SET] Cached count for key: ${cacheKey}, value: ${result.rows[0].total}`);
          } catch (err) {
            console.error('Redis set error:', err);
          }
        }

        return result;
      })();
    }
  } else {
    countPromise = Promise.resolve({ rows: [{ total: null }] });
  }

  const [{ rows }, { rows: countRows }] = await Promise.all([dataPromise, countPromise]);

  const hasNext = rows.length > take;
  const data = hasNext ? rows.slice(0, take) : rows;

  // Fetch ERC-20 token balances for returned addresses
  if (data.length > 0) {
    const addresses = data.map(r => (r.address || '').toLowerCase());
    const networks = data.map(r => (r.network || '').toLowerCase());
    try {
      const erc20Result = await pool.query(`
        SELECT LOWER(ctb.address) AS address, ctb.network,
          jsonb_agg(jsonb_build_object('symbol', ctb.symbol, 'balance', ctb.balance_wei::text, 'decimals', ctb.decimals)) AS erc20_balances
        FROM contract_token_balances ctb
        WHERE (LOWER(ctb.address), LOWER(ctb.network)) IN (
          SELECT LOWER(addr), LOWER(net) FROM unnest($1::text[], $2::text[]) AS t(addr, net)
        )
        GROUP BY LOWER(ctb.address), ctb.network
      `, [addresses, networks]);
      const erc20Map = new Map();
      for (const row of erc20Result.rows) {
        const key = `${row.address.toLowerCase()}:${(row.network || '').toLowerCase()}`;
        erc20Map.set(key, row.erc20_balances || []);
      }
      for (const row of data) {
        const key = `${(row.address || '').toLowerCase()}:${(row.network || '').toLowerCase()}`;
        row.erc20_balances = erc20Map.get(key) || [];
      }
    } catch (err) {
      console.warn('[address.service] ERC-20 balances fetch failed:', err.message);
      if (err.message?.includes('does not exist')) {
        console.warn('[address.service] Hint: Run scanners to create contract_token_balances table, or ensure backend uses same DB as scanners (PGDATABASE/DATABASE_URL)');
      }
      for (const row of data) row.erc20_balances = [];
    }
  }

  let nextCursor = null;
  if (hasNext) {
    const last = data[data.length - 1];
    if (sortBy === 'first_seen') {
      nextCursor = {
        first_seen: last.first_seen ?? null,
        address: last.address,
      };
    } else {
      // Cursor for native_balance sort (use native_balance for consistent pagination)
      nextCursor = {
        native_balance: last.native_balance ?? last.fund ?? null,
        deployed: last.deployed ?? null,
        address: last.address,
      };
    }
  }

  const totalCount = countRows[0]?.total != null ? Number(countRows[0].total) : null;
  const totalPages = totalCount != null ? Math.ceil(totalCount / take) : null;

  return { limit: take, hasNext, nextCursor, totalCount, totalPages, data };
};

function buildWhere({
  deployedFrom, deployedTo, fundFrom, fundTo, networks, tags,
  address, contractName, cursor, nativeBalanceFilter
}, sortBy = 'fund') {
  const where = [], params = [];
  const whereNoCursor = [], paramsNoCursor = [];

  const addBoth = (sql, val) => {
    params.push(val);
    where.push(sql.replace(/\$(\d+)/g, () => `$${params.length}`));
    paramsNoCursor.push(val);
    whereNoCursor.push(sql.replace(/\$(\d+)/g, () => `$${paramsNoCursor.length}`));
  };

  if (deployedFrom != null) addBoth(`deployed > $1`, deployedFrom);
  if (deployedTo   != null) addBoth(`deployed <=  $1`, deployedTo);
  if (nativeBalanceFilter?.sql && nativeBalanceFilter?.params?.length) {
    const baseIdx = params.length + 1;
    const sql = nativeBalanceFilter.sql.replace(/\$(\d+)/g, (_, n) => `$${baseIdx - 1 + parseInt(n, 10)}`);
    params.push(...nativeBalanceFilter.params);
    paramsNoCursor.push(...nativeBalanceFilter.params);
    where.push(sql);
    whereNoCursor.push(sql);
  } else {
    if (fundFrom != null) addBoth(`fund     >= $1`, fundFrom);
    if (fundTo   != null) addBoth(`fund      < $1`, fundTo);
  }
  if (networks?.length)     addBoth(`LOWER(network) = ANY($1)`, networks.map(n => String(n).toLowerCase()));
  if (tags?.length)         addBoth(`tags && $1::text[]`, tags);
  if (address) {
    // Addresses are already stored in lowercase, so direct comparison is possible
    const addressStr = address.toLowerCase();
    if (addressStr.length === 42 && addressStr.startsWith('0x')) {
      // Use exact matching for complete addresses (fastest)
      addBoth(`address = $1`, addressStr);
    } else if (addressStr.length >= 10) {
      // Use prefix matching for 10+ characters (can utilize index)
      addBoth(`address LIKE $1`, `${addressStr}%`);
    } else {
      // Use partial matching for short search terms
      addBoth(`address LIKE $1`, `%${addressStr}%`);
    }
  }
  if (contractName)         addBoth(`contract_name ILIKE $1`, `%${contractName}%`);

  // 🔑 Cursor conditions are added only to "data where" (not added to count query)
  if (cursor && cursor.address) {
    if (sortBy === 'first_seen') {
      params.push(cursor.first_seen ?? null, cursor.address);
      const f1 = `$${params.length-1}`;
      const f2 = `$${params.length}`;
      where.push(`
        (
          COALESCE(first_seen, -1) <  COALESCE(${f1}, -1)
          OR (COALESCE(first_seen, -1) = COALESCE(${f1}, -1) AND address > ${f2})
        )
      `);
    } else {
      // Cursor for native_balance sort (use native_balance for consistent pagination)
      const balanceVal = cursor.native_balance ?? cursor.fund ?? null;
      params.push(balanceVal, cursor.deployed ?? null, cursor.address);
      const f1 = `$${params.length-2}`;
      const f2 = `$${params.length-1}`;
      const f3 = `$${params.length}`;
      where.push(`
        (
          COALESCE(native_balance, -1::numeric) <  COALESCE(${f1}::numeric, -1::numeric)
          OR (COALESCE(native_balance, -1::numeric) = COALESCE(${f1}::numeric, -1::numeric) AND COALESCE(deployed, -1::bigint) <  COALESCE(${f2}::bigint, -1::bigint))
          OR (COALESCE(native_balance, -1::numeric) = COALESCE(${f1}::numeric, -1::numeric) AND COALESCE(deployed, -1::bigint) = COALESCE(${f2}::bigint, -1::bigint) AND address > ${f3})
        )
      `);
    }
  }

  return {
    whereSql: where.length ? `WHERE ${where.join(' AND ')}` : '',
    params,
    whereSqlNoCursor: whereNoCursor.length ? `WHERE ${whereNoCursor.join(' AND ')}` : '',
    paramsNoCursor
  };
}

// ensureDbUrl is provided by ./db; local duplicate removed


// Cache for network counts (refreshed every 4 hours)
let networkCountsCache = null;
let networkCountsCacheTime = 0;
const NETWORK_COUNTS_CACHE_TTL = 4 * 60 * 60 * 1000; // 4 hours

exports.getNetworkCounts = async (forceRefresh = false) => {
  ensureDbUrl();

  // Return cached result if still valid (unless force refresh)
  const now = Date.now();
  if (!forceRefresh && networkCountsCache && (now - networkCountsCacheTime) < NETWORK_COUNTS_CACHE_TTL) {
    return networkCountsCache;
  }

  // Query database (verified contracts only)
  const { rows } = await pool.query(`
    SELECT network, COUNT(*)::bigint AS count
    FROM addresses
    WHERE ${CONTRACT_LIST_WHERE}
    GROUP BY network
  `);
  const out = {};
  for (const r of rows) {
    const key = (r.network || '').toLowerCase();
    if (key) out[key] = Number(r.count);
  }

  // Ensure all known networks appear (with 0 if missing) so UI always shows a count
  const KNOWN_NETWORKS = ['ethereum', 'binance', 'optimism', 'base', 'arbitrum', 'polygon', 'avalanche', 'gnosis', 'linea', 'scroll', 'mantle', 'megaeth'];
  for (const net of KNOWN_NETWORKS) {
    if (out[net] === undefined) out[net] = 0;
  }

  // Update cache
  networkCountsCache = out;
  networkCountsCacheTime = now;

  return out;
}

exports.getNativePrices = async () => {
  ensureDbUrl();

  // Network -> candidate symbols in priority order.
  // We prefer wrapped symbols when available because many feeds store WETH/WBNB, etc.
  const networkSymbolCandidates = {
    ethereum: ['WETH', 'ETH'],
    base: ['WETH', 'ETH'],
    optimism: ['WETH', 'ETH'],
    arbitrum: ['WETH', 'ETH'],
    linea: ['WETH', 'ETH'],
    scroll: ['WETH', 'ETH'],
    binance: ['WBNB', 'BNB'],
    avalanche: ['WAVAX', 'AVAX'],
    polygon: ['WPOL', 'POL', 'WMATIC', 'MATIC'],
    mantle: ['WMNT', 'MNT'],
    gnosis: ['WXDAI', 'XDAI', 'DAI']
  };

  const allSymbols = [...new Set(
    Object.values(networkSymbolCandidates)
      .flat()
      .map(symbol => symbol.toLowerCase())
  )];

  const { rows } = await pool.query(
    `
      SELECT LOWER(symbol) AS symbol, price_usd
      FROM symbol_prices
      WHERE LOWER(symbol) = ANY($1)
    `,
    [allSymbols]
  );

  const symbolToPrice = new Map();
  for (const row of rows) {
    const price = Number(row.price_usd);
    if (Number.isFinite(price) && price > 0) {
      symbolToPrice.set(row.symbol, price);
    }
  }

  const out = {};
  for (const [network, candidates] of Object.entries(networkSymbolCandidates)) {
    for (const candidate of candidates) {
      const price = symbolToPrice.get(candidate.toLowerCase());
      if (price != null) {
        out[network] = price;
        break;
      }
    }
  }

  return out;
};

/**
 * Escape special characters for PostgreSQL LIKE/ILIKE patterns.
 */
function escapeLikePattern(s) {
  const str = String(s || '');
  return str.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

/**
 * Search contracts by code snippet (substring match).
 * Uses contract_sources table.
 * @param {Object} opts - { codeSnippet, limit, networks }
 * @returns {Object} - { matches: [{ address, network, contract_name, verified }] }
 */
/**
 * Get a single contract by address and network.
 * Returns address metadata + source code from contract_sources.
 * @param {string} address - Contract address (lowercase)
 * @param {string} network - Network name (lowercase)
 * @returns {Object|null} Contract with source_code, or null if not found
 */
exports.getContractByAddress = async (address, network) => {
  ensureDbUrl();
  const addr = String(address || '').trim().toLowerCase();
  const net = String(network || '').trim().toLowerCase();
  if (!addr || !net || !addr.startsWith('0x')) {
    return null;
  }

  // Use LEFT JOIN so we can return contract metadata even if source is missing.
  // Match on LOWER() to handle any case differences between addresses and contract_sources.
  const { rows } = await pool.query(
    `
    SELECT
      a.address, a.contract_name, a.deployed, a.fund, a.native_balance, a.network,
      a.first_seen, a.verified, a.is_proxy, a.implementation_address,
      a.proxy_contract_name, a.implementation_contract_name,
      a.deploy_tx_hash, a.deployer_address, a.deploy_block_number,
      a.deployed_at_timestamp, a.deployed_at, a.confidence, a.fetched_at,
      COALESCE(a.evmbench, false) AS evmbench, COALESCE(a.getrecon, false) AS getrecon,
      cs.source_code, cs.source_code_hash, cs.compiler_version, cs.optimization_used,
      cs.runs, cs.abi, cs.contract_file_name, cs.compiler_type, cs.evm_version,
      cs.constructor_arguments, cs.library, cs.license_type
    FROM addresses a
    LEFT JOIN contract_sources cs ON LOWER(cs.address) = LOWER(a.address) AND LOWER(cs.network) = LOWER(a.network)
    WHERE LOWER(a.address) = $1 AND LOWER(a.network) = $2
      AND (a.tags IS NULL OR NOT 'EOA' = ANY(COALESCE(a.tags, '{}')))
    `,
    [addr, net]
  );

  if (rows.length === 0) return null;

  const row = rows[0];
  // Fetch ERC-20 token balances for this contract
  let erc20_balances = [];
  try {
    const erc20Result = await pool.query(
      `
      SELECT symbol, balance_wei::text AS balance, decimals
      FROM contract_token_balances
      WHERE LOWER(address) = $1 AND LOWER(network) = $2
      `,
      [addr, net]
    );
    erc20_balances = (erc20Result.rows || []).map((r) => ({
      symbol: r.symbol,
      balance: r.balance,
      decimals: r.decimals,
    }));
  } catch (err) {
    // contract_token_balances may not exist
  }

  return {
    ...row,
    erc20_balances,
  };
};

/**
 * Start an AI audit via evmbench.
 * @param {string} address - Contract address (lowercase)
 * @param {string} network - Network name (lowercase)
 * @param {string} openaiKey - User's OpenAI API key
 * @param {string} [model] - Model key (default: codex-gpt-5.2)
 * @returns {Promise<Object>} - { ok, auditReport, error }
 */
exports.startAudit = async (address, network, openaiKey, model) => {
  ensureDbUrl();
  const addr = String(address || '').trim().toLowerCase();
  const net = String(network || '').trim().toLowerCase();
  if (!addr || !net || !addr.startsWith('0x')) {
    return { ok: false, error: 'address and network are required' };
  }
  if (!openaiKey || typeof openaiKey !== 'string' || !openaiKey.trim()) {
    return { ok: false, error: 'openai_key is required' };
  }

  const contract = await exports.getContractByAddress(addr, net);
  if (!contract) {
    return { ok: false, error: 'Contract not found' };
  }
  if (!contract.source_code || !contract.source_code.trim()) {
    return { ok: false, error: 'No source code available for this contract' };
  }

  const evmbench = require('./evmbench.service');
  let jobId;
  let status;
  try {
    const result = await evmbench.startAuditJob(
      contract.source_code,
      contract.contract_file_name || contract.contract_name,
      openaiKey.trim(),
      model || 'codex-gpt-5.2'
    );
    jobId = result.jobId;
    status = result.status;
  } catch (err) {
    console.error('evmbench startAuditJob failed:', err?.message || err);
    return { ok: false, error: err.message || 'Failed to start audit' };
  }

  const modelVal = model || 'codex-gpt-5.2';
  const { rows } = await pool.query(
    `INSERT INTO audit_reports (address, network, status, evmbench_job_id, model, triggered_at)
     VALUES ($1, $2, 'pending', $3, $4, NOW())
     RETURNING id, address, network, status, evmbench_job_id, model, triggered_at, completed_at`,
    [addr, net, jobId, modelVal]
  );
  const auditReport = rows[0];
  return { ok: true, auditReport };
};

/**
 * Get latest audit and fuzz reports for a contract.
 * @param {string} address - Contract address (lowercase)
 * @param {string} network - Network name (lowercase)
 * @returns {Object} - { auditReport, fuzzReport } (each may be null)
 */
exports.getContractReports = async (address, network) => {
  ensureDbUrl();
  const addr = String(address || '').trim().toLowerCase();
  const net = String(network || '').trim().toLowerCase();
  if (!addr || !net) {
    return { auditReport: null, fuzzReport: null };
  }

  const [auditResult, fuzzResult] = await Promise.all([
    pool.query(
      `SELECT id, address, network, status, report_json, raw_output, evmbench_job_id, model, triggered_at, completed_at
       FROM audit_reports
       WHERE LOWER(address) = $1 AND LOWER(network) = $2
       ORDER BY triggered_at DESC
       LIMIT 1`,
      [addr, net]
    ),
    pool.query(
      `SELECT id, address, network, status, report_json, raw_output, campaign_id, triggered_at, completed_at
       FROM fuzz_reports
       WHERE LOWER(address) = $1 AND LOWER(network) = $2
       ORDER BY triggered_at DESC
       LIMIT 1`,
      [addr, net]
    ),
  ]);

  let auditReport = auditResult.rows[0] || null;

  let evmbenchJob = null;

  // Lazy-poll evmbench when audit is pending
  if (auditReport && auditReport.status === 'pending' && auditReport.evmbench_job_id) {
    try {
      const evmbench = require('./evmbench.service');
      const jobStatus = await evmbench.getJobStatus(auditReport.evmbench_job_id);
      evmbenchJob = {
        status: jobStatus.status,
        model: jobStatus.model,
        file_name: jobStatus.file_name,
        created_at: jobStatus.created_at,
        started_at: jobStatus.started_at,
        queue_position: jobStatus.queue_position,
      };
      if (jobStatus.status === 'succeeded') {
        const updateModel = jobStatus.model || auditReport.model;
        if (updateModel) {
          await pool.query(
            `UPDATE audit_reports SET status = 'completed', report_json = $1, completed_at = NOW(), model = $3 WHERE id = $2`,
            [JSON.stringify(jobStatus.result || {}), auditReport.id, updateModel]
          );
        } else {
          await pool.query(
            `UPDATE audit_reports SET status = 'completed', report_json = $1, completed_at = NOW() WHERE id = $2`,
            [JSON.stringify(jobStatus.result || {}), auditReport.id]
          );
        }
        auditReport = {
          ...auditReport,
          status: 'completed',
          report_json: jobStatus.result,
          completed_at: new Date(),
          model: updateModel || auditReport.model,
        };
        evmbenchJob = null;
      } else if (jobStatus.status === 'failed') {
        await pool.query(
          `UPDATE audit_reports SET status = 'failed', raw_output = $1, completed_at = NOW() WHERE id = $2`,
          [jobStatus.error || 'Audit failed', auditReport.id]
        );
        auditReport = {
          ...auditReport,
          status: 'failed',
          raw_output: jobStatus.error || 'Audit failed',
          completed_at: new Date(),
        };
        evmbenchJob = null;
      }
    } catch (err) {
      console.warn('evmbench getJobStatus failed:', err?.message || err);
    }
  }

  return {
    auditReport,
    fuzzReport: fuzzResult.rows[0] || null,
    evmbenchJob,
  };
};

const MANUAL_MARKDOWN_MAX_LENGTH = 500 * 1024; // 500KB

/**
 * Save a manual AI audit report (markdown) for a contract.
 * @param {string} address - Contract address (lowercase)
 * @param {string} network - Network name (lowercase)
 * @param {string} markdown - Markdown content
 * @returns {Promise<Object>} - { ok, auditReport, error }
 */
exports.saveManualAuditReport = async (address, network, markdown) => {
  ensureDbUrl();
  const addr = String(address || '').trim().toLowerCase();
  const net = String(network || '').trim().toLowerCase();
  if (!addr || !net || !addr.startsWith('0x')) {
    return { ok: false, error: 'address and network are required' };
  }
  const md = typeof markdown === 'string' ? markdown.trim() : '';
  if (!md) {
    return { ok: false, error: 'Markdown content is required' };
  }
  if (md.length > MANUAL_MARKDOWN_MAX_LENGTH) {
    return { ok: false, error: 'Markdown content exceeds maximum length' };
  }

  const contract = await exports.getContractByAddress(addr, net);
  if (!contract) {
    return { ok: false, error: 'Contract not found' };
  }

  const reportJson = JSON.stringify({ manual: true, markdown: md });
  const { rows } = await pool.query(
    `INSERT INTO audit_reports (address, network, status, report_json, triggered_at, completed_at)
     VALUES ($1, $2, 'completed', $3::jsonb, NOW(), NOW())
     RETURNING id, address, network, status, report_json, raw_output, evmbench_job_id, triggered_at, completed_at`,
    [addr, net, reportJson]
  );
  const auditReport = rows[0];

  await pool.query(
    `UPDATE addresses SET evmbench = true WHERE LOWER(address) = $1 AND LOWER(network) = $2`,
    [addr, net]
  );

  return { ok: true, auditReport };
};

/**
 * Import an evmbench job result into audit_reports (for jobs run from evmbench UI).
 * @param {string} address - Contract address (lowercase)
 * @param {string} network - Network name (lowercase)
 * @param {string} evmbenchJobId - evmbench job UUID
 * @returns {Promise<Object>} - { ok, auditReport, error }
 */
exports.importEvmbenchJob = async (address, network, evmbenchJobId) => {
  ensureDbUrl();
  const addr = String(address || '').trim().toLowerCase();
  const net = String(network || '').trim().toLowerCase();
  const jobId = String(evmbenchJobId || '').trim();
  if (!addr || !net || !addr.startsWith('0x')) {
    return { ok: false, error: 'address and network are required' };
  }
  if (!jobId) {
    return { ok: false, error: 'evmbench_job_id is required' };
  }

  const contract = await exports.getContractByAddress(addr, net);
  if (!contract) {
    return { ok: false, error: 'Contract not found' };
  }

  let jobStatus;
  try {
    const evmbench = require('./evmbench.service');
    jobStatus = await evmbench.getJobStatus(jobId);
  } catch (err) {
    console.error('importEvmbenchJob getJobStatus failed:', err?.message || err);
    return { ok: false, error: err?.message || 'Failed to fetch evmbench job' };
  }

  if (jobStatus.status !== 'succeeded' && jobStatus.status !== 'failed') {
    return { ok: false, error: `Job is still ${jobStatus.status}. Wait for it to complete.` };
  }

  const status = jobStatus.status === 'succeeded' ? 'completed' : 'failed';
  const reportJson = jobStatus.status === 'succeeded' ? JSON.stringify(jobStatus.result || {}) : null;
  const rawOutput = jobStatus.status === 'failed' ? (jobStatus.error || 'Audit failed') : null;

  const { rows } = await pool.query(
    `INSERT INTO audit_reports (address, network, status, report_json, raw_output, evmbench_job_id, triggered_at, completed_at)
     VALUES ($1, $2, $3, $4::jsonb, $5, $6::uuid, NOW(), NOW())
     RETURNING id, address, network, status, report_json, raw_output, evmbench_job_id, triggered_at, completed_at`,
    [addr, net, status, reportJson, rawOutput, jobId]
  );
  const auditReport = rows[0];

  await pool.query(
    `UPDATE addresses SET evmbench = true WHERE LOWER(address) = $1 AND LOWER(network) = $2`,
    [addr, net]
  );

  return { ok: true, auditReport };
};

/**
 * Save a manual Get Recon / fuzz report (markdown) for a contract.
 * @param {string} address - Contract address (lowercase)
 * @param {string} network - Network name (lowercase)
 * @param {string} markdown - Markdown content
 * @returns {Promise<Object>} - { ok, fuzzReport, error }
 */
exports.saveManualReconReport = async (address, network, markdown) => {
  ensureDbUrl();
  const addr = String(address || '').trim().toLowerCase();
  const net = String(network || '').trim().toLowerCase();
  if (!addr || !net || !addr.startsWith('0x')) {
    return { ok: false, error: 'address and network are required' };
  }
  const md = typeof markdown === 'string' ? markdown.trim() : '';
  if (!md) {
    return { ok: false, error: 'Markdown content is required' };
  }
  if (md.length > MANUAL_MARKDOWN_MAX_LENGTH) {
    return { ok: false, error: 'Markdown content exceeds maximum length' };
  }

  const contract = await exports.getContractByAddress(addr, net);
  if (!contract) {
    return { ok: false, error: 'Contract not found' };
  }

  const reportJson = JSON.stringify({ manual: true, markdown: md });
  const { rows } = await pool.query(
    `INSERT INTO fuzz_reports (address, network, status, report_json, triggered_at, completed_at)
     VALUES ($1, $2, 'completed', $3::jsonb, NOW(), NOW())
     RETURNING id, address, network, status, report_json, raw_output, campaign_id, triggered_at, completed_at`,
    [addr, net, reportJson]
  );
  const fuzzReport = rows[0];

  await pool.query(
    `UPDATE addresses SET getrecon = true WHERE LOWER(address) = $1 AND LOWER(network) = $2`,
    [addr, net]
  );

  return { ok: true, fuzzReport };
};

exports.searchByCode = async (opts = {}) => {
  ensureDbUrl();
  const codeSnippet = (opts.codeSnippet || opts.code || '').trim();
  if (!codeSnippet || codeSnippet.length < 5) {
    return { matches: [], error: 'codeSnippet must be at least 5 characters' };
  }

  const limit = Math.min(Math.max(+(opts.limit || 50), 1), 200);
  const networks = Array.isArray(opts.networks) ? opts.networks.map(n => String(n).toLowerCase()) : null;

  const escaped = escapeLikePattern(codeSnippet);
  const pattern = `%${escaped}%`;

  let query = `
    SELECT a.address, a.network, a.contract_name, a.verified,
           a.deployed, a.fund
    FROM contract_sources cs
    JOIN addresses a ON a.address = cs.address AND a.network = cs.network
    WHERE cs.source_code ILIKE $1
  `;
  const params = [pattern];

  if (networks && networks.length > 0) {
    params.push(networks);
    query += ` AND LOWER(a.network) = ANY($${params.length})`;
  }

  query += ` ORDER BY a.fund DESC NULLS LAST, a.deployed DESC NULLS LAST LIMIT $${params.length + 1}`;
  params.push(limit);

  const { rows } = await pool.query(query, params);
  return { matches: rows };
};
