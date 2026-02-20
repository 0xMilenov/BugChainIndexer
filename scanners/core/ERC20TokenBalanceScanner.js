/* eslint-disable no-console */
/**
 * ERC20 Token Balance Scanner
 * Fetches ERC-20 token balances via BalanceHelper RPC (batch) or Etherscan API (fallback).
 * Uses well-known tokens from scanners/tokens/{network}.json.
 */
const Scanner = require('../common/Scanner');
const fs = require('fs');
const path = require('path');
const { getTokenBalanceEtherscan, sleep, contractCall } = require('../common/core');
const { normalizeAddress } = require('../common');

const CONTRACT_LIST_WHERE_VERIFIED = `(tags IS NULL OR NOT 'EOA' = ANY(tags)) AND verified = true AND EXISTS (SELECT 1 FROM contract_sources cs WHERE cs.address = addresses.address AND cs.network = addresses.network)`;
const CONTRACT_LIST_WHERE_ALL = `(tags IS NULL OR NOT 'EOA' = ANY(tags))`;

class ERC20TokenBalanceScanner extends Scanner {
  constructor() {
    super('ERC20TokenBalanceScanner', {
      timeout: 7200,
      batchSizes: {}
    });

    this.batchSize = parseInt(process.env.ERC20_BATCH_SIZE || '2000', 10);
    this.pilotLimit = process.env.ERC20_PILOT_LIMIT ? parseInt(process.env.ERC20_PILOT_LIMIT, 10) : null;
    this.contractLimit = process.env.ERC20_CONTRACT_LIMIT ? parseInt(process.env.ERC20_CONTRACT_LIMIT, 10) : null;
    this.tokenLimit = parseInt(process.env.ERC20_TOKEN_LIMIT || '100', 10);  // All tokens from JSON (~100) - RPC batch has no rate limit
    this.apiDelayMs = parseInt(process.env.ERC20_API_DELAY_MS || '400', 10);  // 400ms = 2.5 calls/sec (Etherscan limit: 3/sec)
    this.maxAgeDays = parseInt(process.env.ERC20_MAX_AGE_DAYS || '7', 10);
    this.currentTime = Math.floor(Date.now() / 1000);
    this.badTokens = new Set();
  }

  /**
   * Load tokens from tokens/{network}.json
   * Returns array of { address, symbol, decimals } sorted by rank
   */
  loadTokens() {
    const tokensFilePath = path.join(__dirname, '..', 'tokens', `${this.network}.json`);
    try {
      const tokensData = JSON.parse(fs.readFileSync(tokensFilePath, 'utf8'));
      const sortedTokens = tokensData
        .filter(t => t.symbol && t.address)
        .sort((a, b) => (a.rank || Infinity) - (b.rank || Infinity))
        .slice(0, this.tokenLimit);
      return sortedTokens.map(t => ({
        address: t.address.toLowerCase(),
        symbol: t.symbol,
        decimals: t.decimals ?? 18
      }));
    } catch (error) {
      this.log(`Failed to load tokens from ${tokensFilePath}: ${error.message}`, 'warn');
      return [];
    }
  }

  /**
   * Get contracts that need ERC-20 balance data.
   * Skips contracts that already have any contract_token_balances rows.
   * For refresh: also includes contracts with stale data (last_updated < cutoff).
   */
  async getContractsToProcess() {
    const cutoffTime = this.currentTime - this.maxAgeDays * 24 * 60 * 60;
    let limit = this.contractLimit ?? this.batchSize;
    if (this.pilotLimit != null && this.pilotLimit > 0) {
      limit = Math.min(limit, this.pilotLimit);
    }
    const includeUnverified = process.env.ERC20_INCLUDE_UNVERIFIED === '1';
    const contractWhere = includeUnverified ? CONTRACT_LIST_WHERE_ALL : CONTRACT_LIST_WHERE_VERIFIED;
    const query = `
      SELECT a.address, ctb.last_erc20
      FROM addresses a
      LEFT JOIN (
        SELECT address, network, MAX(last_updated) AS last_erc20
        FROM contract_token_balances
        GROUP BY address, network
      ) ctb ON a.address = ctb.address AND a.network = ctb.network
      WHERE a.network = $1
        AND ${contractWhere.replace(/addresses\./g, 'a.')}
        AND (ctb.address IS NULL OR ctb.last_erc20 < $2)
      ORDER BY ctb.last_erc20 ASC NULLS FIRST
      LIMIT $3
    `;
    const result = await this.queryDB(query, [this.network, cutoffTime, limit]);
    return result.rows.map(r => ({ address: r.address, hasExistingData: r.last_erc20 != null }));
  }

  /**
   * Delete existing balances for a contract before upserting (refresh)
   */
  async deleteContractBalances(address) {
    await this.queryDB(
      'DELETE FROM contract_token_balances WHERE address = $1 AND network = $2',
      [address, this.network]
    );
  }

  /**
   * Insert non-zero token balances for a contract
   */
  async insertBalances(balances) {
    if (balances.length === 0) return;
    for (const b of balances) {
      await this.queryDB(
        `INSERT INTO contract_token_balances (address, network, token_address, symbol, decimals, balance_wei, last_updated)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (address, network, token_address) DO UPDATE SET
           symbol = EXCLUDED.symbol,
           decimals = EXCLUDED.decimals,
           balance_wei = EXCLUDED.balance_wei,
           last_updated = EXCLUDED.last_updated`,
        [b.address, b.network, b.token_address, b.symbol, b.decimals, b.balance_wei, b.last_updated]
      );
    }
  }

  async run() {
    const config = this.config;
    if (!config?.chainId || config.chainId === 0) {
      this.log(`Skipping ${this.network}: no chainId or non-EVM`, 'warn');
      return;
    }

    const balanceHelper = contractCall.getBalanceContract(this.network);
    this.useRpc = !!balanceHelper;
    if (this.useRpc) {
      this.log('Starting ERC-20 token balance scan via BalanceHelper RPC (batch)');
    } else {
      this.log(`No BalanceHelper for ${this.network}, using Etherscan fallback`);
    }

    const tokens = this.loadTokens();
    if (tokens.length === 0) {
      this.log(`No tokens configured for ${this.network}, skipping`, 'warn');
      return;
    }

    this.log(`Loaded ${tokens.length} tokens for ${this.network}`);

    const contracts = await this.getContractsToProcess();
    this.log(`Found ${contracts.length} contracts to process`);
    if (this.pilotLimit != null && this.pilotLimit > 0) {
      this.log(`Pilot mode: processing max ${this.pilotLimit} contracts`);
    }

    if (contracts.length === 0) {
      this.log('No contracts to process');
      return;
    }

    if (this.useRpc) {
      await this.runViaRpc(contracts, tokens);
    } else {
      await this.runViaEtherscan(contracts, tokens);
    }
  }

  /**
   * Batch fetch via BalanceHelper RPC - no Etherscan rate limits
   */
  async runViaRpc(contracts, tokens) {
    for (const c of contracts) {
      if (c.hasExistingData) {
        await this.deleteContractBalances(normalizeAddress(c.address));
      }
    }

    const holders = contracts.map(c => normalizeAddress(c.address));
    const tokenAddresses = tokens.map(t => t.address);

    let erc20Map;
    try {
      erc20Map = await this.getERC20Balances(holders, tokenAddresses);
    } catch (err) {
      this.log(`Batch RPC failed: ${err.message}`, 'error');
      return;
    }

    if (erc20Map.size < contracts.length) {
      this.log(`Partial result: ${erc20Map.size}/${contracts.length} addresses returned`, 'warn');
    }

    const allNonZero = [];
    for (const [holder, tokenMap] of erc20Map) {
      for (const [tokenAddr, { balance }] of tokenMap) {
        if (BigInt(balance || '0') > 0n) {
          const tokenMeta = tokens.find(t => t.address.toLowerCase() === String(tokenAddr).toLowerCase());
          if (tokenMeta) {
            allNonZero.push({
              address: holder,
              network: this.network,
              token_address: tokenMeta.address,
              symbol: tokenMeta.symbol,
              decimals: tokenMeta.decimals,
              balance_wei: String(balance),
              last_updated: this.currentTime
            });
          }
        }
      }
    }

    if (allNonZero.length > 0) {
      await this.insertBalances(allNonZero);
    }

    this.log(`Completed: ${erc20Map.size} contracts processed, ${allNonZero.length} non-zero token balances stored`);
  }

  /**
   * Fallback: per-contract per-token via Etherscan API (rate limited)
   */
  async runViaEtherscan(contracts, tokens) {
    let processed = 0;
    let totalNonZero = 0;

    for (let i = 0; i < contracts.length; i++) {
      const { address: rawAddress, hasExistingData } = contracts[i];
      const address = normalizeAddress(rawAddress);
      try {
        if (hasExistingData) {
          await this.deleteContractBalances(address);
        }

        const nonZeroBalances = [];
        for (const token of tokens) {
          try {
            await sleep(this.apiDelayMs);
            const balanceStr = await getTokenBalanceEtherscan(this.network, address, token.address);
            const balanceWei = BigInt(balanceStr);
            if (balanceWei > 0n) {
              nonZeroBalances.push({
                address,
                network: this.network,
                token_address: token.address,
                symbol: token.symbol,
                decimals: token.decimals,
                balance_wei: balanceStr,
                last_updated: this.currentTime
              });
            }
          } catch (err) {
            const isNotOk = String(err.message || '').toUpperCase().includes('NOTOK');
            const tokenKey = `${token.symbol}:${token.address}`;
            if (isNotOk && !this.badTokens.has(tokenKey)) {
              this.badTokens.add(tokenKey);
              this.log(`Token ${token.symbol} returns NOTOK (skipping for remaining contracts)`, 'warn');
            } else if (!isNotOk) {
              this.log(`Token ${token.symbol} for ${address}: ${err.message}`, 'warn');
            }
          }
        }

        if (nonZeroBalances.length > 0) {
          await this.insertBalances(nonZeroBalances);
          totalNonZero += nonZeroBalances.length;
        }

        processed++;
        if (processed % 10 === 0) {
          this.log(`Progress: ${processed}/${contracts.length} contracts`);
        }
      } catch (error) {
        this.log(`Failed to process ${address}: ${error.message}`, 'warn');
      }
    }

    this.log(`Completed: ${processed} contracts processed, ${totalNonZero} non-zero token balances stored`);
  }
}

if (require.main === module) {
  process.env.AUTO_EXIT = 'true';
  const timeoutSeconds = parseInt(process.env.TIMEOUT_SECONDS || '7200', 10);
  const forceExit = setTimeout(() => {
    console.log(`Force terminating process (${timeoutSeconds}s timeout)`);
    process.exit(0);
  }, timeoutSeconds * 1000);

  const scanner = new ERC20TokenBalanceScanner();
  scanner.execute()
    .then(() => {
      console.log('ERC20TokenBalanceScanner completed');
      clearTimeout(forceExit);
    })
    .catch(err => {
      console.error('ERC20TokenBalanceScanner failed:', err);
      clearTimeout(forceExit);
      process.exit(1);
    });
}

module.exports = ERC20TokenBalanceScanner;
