/* eslint-disable no-console */
/**
 * Fund Updater Scanner
 * Updates asset prices and balances using public RPC and free CoinGecko prices
 */
const Scanner = require('../common/Scanner');
const fs = require('fs');
const path = require('path');
// Token addresses loaded from network config
const { batchUpdateFunds, normalizeAddress } = require('../common');
const { CONFIG } = require('../config/networks.js');
const TokenPriceCache = require('../common/TokenPriceCache');
const { CoinGeckoPriceProvider } = require('../common/CoinGeckoPriceProvider');

class FundUpdater extends Scanner {
  constructor(network) {
    super('FundUpdater', {
      network,
      timeout: 7200,
      batchSizes: {
        addresses: 1000
      }
    });

    this.delayDays = CONFIG.FUNDUPDATEDELAY || 7;
    this.priceCache = new TokenPriceCache();
    this.priceProvider = new CoinGeckoPriceProvider();

    // Dynamic batch sizing for balance calls (for BalanceHelper mode)
    this.currentBatchSize = 200;  // Start with 200
    this.minBatchSize = 20;       // Minimum batch size
    this.maxBatchSize = 500;      // Maximum batch size
    this.failureCount = 0;        // Track consecutive failures
    this.successCount = 0;        // Track consecutive successes
  }

  // Adjust batch size based on success/failure patterns
  adjustBatchSize(isSuccess) {
    if (isSuccess) {
      this.successCount++;
      this.failureCount = 0;

      // After 3 consecutive successes, try to increase batch size
      if (this.successCount >= 3 && this.currentBatchSize < this.maxBatchSize) {
        this.currentBatchSize = Math.min(this.maxBatchSize, this.currentBatchSize + 50);
        this.log(`🔼 Increased batch size to ${this.currentBatchSize} after consecutive successes`);
        this.successCount = 0;
      }
    } else {
      this.failureCount++;
      this.successCount = 0;

      // On any failure, reduce batch size immediately
      if (this.currentBatchSize > this.minBatchSize) {
        this.currentBatchSize = Math.max(this.minBatchSize, Math.floor(this.currentBatchSize * 0.6));
        this.log(`🔽 Reduced batch size to ${this.currentBatchSize} after failure`);
      }
    }
  }

  // Split addresses into dynamic-sized chunks
  chunkAddresses(addresses) {
    const chunks = [];
    for (let i = 0; i < addresses.length; i += this.currentBatchSize) {
      chunks.push(addresses.slice(i, i + this.currentBatchSize));
    }
    return chunks;
  }

  // Load token addresses and symbol mapping from tokens/{network}.json file
  // Returns: { tokenAddresses: [], addressToSymbolMap: {}, addressToTokenMap: {} }
  loadTokenAddressMapping() {
    const tokensFilePath = path.join(__dirname, '..', 'tokens', `${this.network}.json`);
    let tokenAddresses = [];
    let addressToSymbolMap = {};
    let addressToTokenMap = {};

    try {
      const tokensData = JSON.parse(fs.readFileSync(tokensFilePath, 'utf8'));

      const tokenLimit = parseInt(process.env.FUND_TOKEN_LIMIT || process.env.ERC20_TOKEN_LIMIT || '15', 10);
      const sortedTokens = tokensData
        .filter(token => token.symbol && token.address)
        .sort((a, b) => (a.rank || Infinity) - (b.rank || Infinity))
        .slice(0, tokenLimit);

      sortedTokens.forEach(token => {
        const addressLower = token.address.toLowerCase();
        tokenAddresses.push(addressLower);
        addressToSymbolMap[addressLower] = token.symbol;
        addressToTokenMap[addressLower] = {
          symbol: token.symbol,
          name: token.name,
          address: token.address,
          decimals: token.decimals  // Use decimals from tokens file (no default)
        };
      });

      this.log(`📋 Loaded ${tokenAddresses.length} token addresses from tokens/${this.network}.json (top ${tokenLimit})`);
    } catch (error) {
      this.log(`⚠️  Failed to load tokens from file: ${error.message}`, 'warn');
      this.log('📋 Falling back to empty token list', 'warn');
    }

    return { tokenAddresses, addressToSymbolMap, addressToTokenMap };
  }

  async getOutdatedAddresses() {
    const allFlag = process.env.ALL_FLAG;
    const highFundFlag = process.env.HIGH_FUND_FLAG; // New flag for high fund addresses
    const cutoffTime = allFlag ? 0xffffffff : (this.currentTime - this.delayDays * 24 * 60 * 60);
    const maxBatch = parseInt(process.env.FUND_UPDATE_MAX_BATCH || '50000', 10);
    const minFund = highFundFlag ? 100000 : 0; // Filter for 100K+ funds
    
    this.log(`🔍 ALL_FLAG: ${allFlag}, HIGH_FUND_FLAG: ${highFundFlag}`);
    this.log(`🔍 cutoffTime: ${cutoffTime}, maxBatch: ${maxBatch}`);

    // Optimized query with array operations instead of LIKE for better performance
    // Allow processing addresses even without code_hash if ALL_FLAG is set
    let query = `
      SELECT address FROM addresses
      WHERE network = $1`;
    
    let params = [this.network];  // $1: network filter
    
    // Add conditions based on flags
    if (!allFlag) {
      query += `
      AND (last_fund_updated IS NULL OR last_fund_updated < $2)
      AND code_hash IS NOT NULL
      AND code_hash != $3
      AND code_hash != ''`;
      params.push(cutoffTime);        // $2: cutoff timestamp for last_fund_updated (7 days ago)
      params.push(this.ZERO_HASH);    // $3: zero hash to exclude
    }
    
    query += `
      AND (tags IS NULL OR NOT ('EOA' = ANY(tags)))`;
    
    // Add high fund filter if enabled
    if (highFundFlag) {
      const fundParamIndex = allFlag ? '$2' : '$4';
      const limitParamIndex = allFlag ? '$3' : '$5';

      query += ` AND COALESCE(fund_usd, fund, 0) >= ${fundParamIndex}`;
      params.push(minFund);
      query += ` ORDER BY COALESCE(fund_usd, fund, 0) DESC, last_fund_updated ASC NULLS FIRST LIMIT ${limitParamIndex}`;
      params.push(maxBatch);

      this.log(`🏛️ High fund mode enabled: targeting addresses with fund >= ${minFund.toLocaleString()}`);
    } else {
      const limitParamIndex = allFlag ? '$2' : '$4';
      query += ` ORDER BY last_fund_updated ASC NULLS FIRST LIMIT ${limitParamIndex}`;
      params.push(maxBatch);
    }
    
    this.log(`🔍 Query: ${query}`);
    this.log(`🔍 Params: ${JSON.stringify(params)}`);
    
    const result = await this.queryDB(query, params);  // Skip cache for debugging
    const addresses = result.rows.map(row => row.address);
    
    this.log(`🔍 Query returned ${addresses.length} addresses`);
    
    if (highFundFlag) {
      this.log(`📊 Found ${addresses.length} high-value addresses (fund >= ${minFund.toLocaleString()}) for update`);
    }
    
    return addresses;
  }

  /**
   * Fetch and update token prices using CoinGecko's free simple price API.
   * Decimals remain sourced from scanners/tokens/{network}.json.
   */
  async updateTokenPrices() {
    const lockId = 12345;

    try {
      this.log('🔒 Acquiring lock for symbol_prices updates...');
      await this.queryDB('SELECT pg_advisory_lock($1)', [lockId]);
      this.log('✅ Lock acquired');

      const { addressToSymbolMap } = this.loadTokenAddressMapping();
      const allSymbols = [...new Set(Object.values(addressToSymbolMap))];
      const nativeSymbol = CONFIG[this.network]?.nativeCurrency;
      if (nativeSymbol && !allSymbols.includes(nativeSymbol)) {
        allSymbols.push(nativeSymbol);
      }

      if (allSymbols.length === 0) {
        this.log('⚠️ No symbols found in tokens file', 'warn');
        return;
      }

      const cutoffTime = this.currentTime - (this.delayDays * 24 * 60 * 60);
      const checkQuery = `
        SELECT symbol FROM symbol_prices
        WHERE LOWER(symbol) = ANY($1::text[])
        AND (last_updated IS NULL OR last_updated < $2)
      `;
      const symbolsLower = allSymbols.map(s => s.toLowerCase());
      const needUpdateResult = await this.queryDB(checkQuery, [symbolsLower, cutoffTime]);
      const symbolsNeedingUpdate = new Set(needUpdateResult.rows.map(r => r.symbol.toUpperCase()));

      // Filter to only symbols that need updating
      const symbolsToUpdate = allSymbols.filter(s => symbolsNeedingUpdate.has(s.toUpperCase()));

      if (symbolsToUpdate.length === 0) {
        this.log(`✅ All ${allSymbols.length} symbols are up-to-date (updated within ${this.delayDays} days)`);
        return;
      }

      this.log(`💰 Fetching prices for ${symbolsToUpdate.length}/${allSymbols.length} symbols from CoinGecko`);
      const prices = await this.priceProvider.fetchPricesBySymbols(symbolsToUpdate);
      const updateQuery = `
        INSERT INTO symbol_prices (symbol, price_usd, decimals, name, last_updated)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (symbol) DO UPDATE SET
          price_usd = EXCLUDED.price_usd,
          decimals = EXCLUDED.decimals,
          name = EXCLUDED.name,
          last_updated = EXCLUDED.last_updated
      `;

      let totalUpdated = 0;
      for (const symbol of symbolsToUpdate) {
        const priceData = prices.get(symbol.toLowerCase());
        if (!priceData) {
          this.log(`⚠️ No CoinGecko price mapping for ${symbol}; keeping price at 0`, 'warn');
          await this.queryDB(updateQuery, [symbol, 0, 18, symbol, this.currentTime]);
          continue;
        }
        await this.queryDB(updateQuery, [
          symbol,
          priceData.price,
          18,
          priceData.name || symbol,
          this.currentTime
        ]);
        totalUpdated++;
      }

      this.log(`✅ Updated ${totalUpdated}/${symbolsToUpdate.length} token prices from CoinGecko`);
    } catch (error) {
      this.log(`❌ Failed to update token prices: ${error.message}`, 'error');
    } finally {
      try {
        await this.queryDB('SELECT pg_advisory_unlock($1)', [lockId]);
        this.log('🔓 Lock released');
      } catch (unlockError) {
        this.log(`⚠️ Failed to release lock: ${unlockError.message}`, 'warn');
      }
    }
  }

  /**
   * Insert missing symbols from tokens folder into symbol_prices table
   * Uses placeholder price of 0 for tokens without price data
   */
  async insertMissingSymbols() {
    // Use advisory lock to prevent concurrent symbol_prices inserts across networks
    const lockId = 12346; // Different ID from updateTokenPrices for finer-grained locking

    try {
      // Acquire advisory lock
      this.log('🔒 Acquiring lock for symbol_prices inserts...');
      await this.queryDB('SELECT pg_advisory_lock($1)', [lockId]);
      this.log('✅ Lock acquired');

      // Load all tokens from tokens/{network}.json
      const { tokenAddresses, addressToSymbolMap } = this.loadTokenAddressMapping();
      const allSymbols = [...new Set(Object.values(addressToSymbolMap))];

      if (allSymbols.length === 0) {
        this.log('⚠️ No symbols found in tokens file', 'warn');
        return;
      }

      // Check which symbols are missing from symbol_prices
      const checkQuery = `
        SELECT LOWER(symbol) as symbol
        FROM symbol_prices
        WHERE LOWER(symbol) = ANY($1::text[])
      `;
      const symbolsLower = allSymbols.map(s => s.toLowerCase());
      const existingResult = await this.queryDB(checkQuery, [symbolsLower]);
      const existingSymbols = new Set(existingResult.rows.map(r => r.symbol));

      const missingSymbols = allSymbols.filter(s => !existingSymbols.has(s.toLowerCase()));

      if (missingSymbols.length === 0) {
        this.log('✅ All symbols already in symbol_prices');
        return;
      }

      this.log(`📝 Inserting ${missingSymbols.length} missing symbols into symbol_prices`);

      // Insert missing symbols with placeholder price 0
      const insertQuery = `
        INSERT INTO symbol_prices (symbol, price_usd, decimals, name, last_updated)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (symbol) DO NOTHING
      `;

      for (const symbol of missingSymbols) {
        await this.queryDB(insertQuery, [
          symbol,
          0, // Placeholder price - will be updated by updateTokenPrices()
          18, // Default decimals
          symbol, // Use symbol as name for now
          null // NULL until actual price is fetched
        ]);
      }

      this.log(`✅ Inserted ${missingSymbols.length} symbols (will fetch prices next)`);
    } catch (error) {
      this.log(`❌ Failed to insert missing symbols: ${error.message}`, 'error');
    } finally {
      // Always release the lock
      try {
        await this.queryDB('SELECT pg_advisory_unlock($1)', [lockId]);
        this.log('🔓 Lock released');
      } catch (unlockError) {
        this.log(`⚠️ Failed to release lock: ${unlockError.message}`, 'warn');
      }
    }
  }

  // Update address funds using BalanceHelper when available, otherwise direct public RPC.
  async updateAddressFunds(addresses) {
    this.log('🔗 Fetching native and token balances through public RPC');

    // Insert missing symbols before fetching prices
    await this.insertMissingSymbols();

    // Update token prices from CoinGecko/free cache
    await this.updateTokenPrices();

    // Load token data from tokens/{network}.json file (includes decimals for each token)
    const { tokenAddresses, addressToSymbolMap, addressToTokenMap } = this.loadTokenAddressMapping();

    // Get unique symbols from loaded tokens
    const symbols = [...new Set(Object.values(addressToSymbolMap))];

    // Add native token symbol for the network
    const nativeSymbol = CONFIG[this.network]?.nativeCurrency;
    if (nativeSymbol && !symbols.includes(nativeSymbol)) {
      symbols.push(nativeSymbol);
    }

    this.log(`📋 Found ${symbols.length} symbols from tokens file (including native token)`);

    // Fetch symbol prices from symbol_prices table (price only, no decimals)
    const { symbols: validSymbols, symbolDataMap } = await this.priceCache.fetchTokenPrices(symbols);
    this.log(`💰 Loaded ${validSymbols.length}/${symbols.length} token prices`);

    const processor = async (addressBatch) => {

      let nativeBalances = [];
      let erc20Balances = new Map();

      // Dynamic chunking with error handling for native balances
      try {
        const addressChunks = this.chunkAddresses(addressBatch);
        this.log(`Processing ${addressBatch.length} addresses in ${addressChunks.length} chunks (chunk size: ${this.currentBatchSize})`);

        for (const chunk of addressChunks) {
          try {
            this.log(`[DEBUG] Attempting batch balance call for ${chunk.length} addresses`);
            const chunkNativeBalances = await this.getNativeBalances(chunk);
            nativeBalances.push(...chunkNativeBalances);

            this.adjustBatchSize(true); // Success
            this.log(`[DEBUG] Batch balance call succeeded for ${chunk.length} addresses`);

          } catch (error) {
            this.log(`❌ Native balance batch failed for chunk of ${chunk.length}: ${error.message}`, 'warn');
            this.adjustBatchSize(false); // Failure

            // Fallback: try smaller chunks or individual calls
            for (const address of chunk) {
              try {
                const balance = await this.getNativeBalances([address]);
                nativeBalances.push(...balance);
              } catch (individualError) {
                this.log(`❌ Individual balance call failed for ${address}: ${individualError.message}`, 'warn');
                nativeBalances.push('0'); // Use 0 as fallback
              }
              await this.sleep(Number(process.env.PUBLIC_RPC_INDIVIDUAL_DELAY_MS || 100));
            }
          }

          await this.sleep(Number(process.env.PUBLIC_RPC_CHUNK_DELAY_MS || 200));
        }
      } catch (error) {
        this.log(`❌ Critical error in native balance processing: ${error.message}`, 'error');
        // Fill with zeros as fallback
        nativeBalances = new Array(addressBatch.length).fill('0');
      }

      // Validate native balances length
      if (nativeBalances.length !== addressBatch.length) {
        const errorMsg = `Native balances length mismatch: expected ${addressBatch.length}, got ${nativeBalances.length}`;
        this.log(`❌ ${errorMsg}`, 'error');
        throw new Error(errorMsg);
      }

      // ERC20 balances - chunkOperation handles chunking and retries automatically
      let erc20Failed = false;
      try {
        erc20Balances = await this.getERC20Balances(addressBatch, tokenAddresses);

        // Validate result size - allow partial results
        if (erc20Balances.size !== addressBatch.length) {
          const missingCount = addressBatch.length - erc20Balances.size;
          this.log(`⚠️  ERC20 balances partial result: ${erc20Balances.size}/${addressBatch.length} addresses (${missingCount} missing)`, 'warn');

          // Only fail if we got less than 50% of expected results
          if (erc20Balances.size < addressBatch.length * 0.5) {
            throw new Error(`Too many missing balances: only ${erc20Balances.size}/${addressBatch.length} retrieved`);
          }
        }
      } catch (error) {
        this.log(`❌ ERC20 balance processing failed: ${error.message}`, 'warn');
        this.log(`⚠️  Continuing with native balance only for this batch`, 'warn');
        erc20Balances = new Map(); // Empty map as fallback - will calculate fund with native balance only
        erc20Failed = true;
      }

      // Process each address using symbol-based data
      const updates = addressBatch.map((address, index) => {
        const nativeBalance = nativeBalances[index]?.toString() || '0';

        // Get native token price from symbol data
        const nativeSymbol = CONFIG[this.network]?.nativeCurrency || 'ETH';
        const nativeSymbolData = symbolDataMap.get(nativeSymbol.toLowerCase());
        const nativePrice = nativeSymbolData ? nativeSymbolData.price : 0;
        const nativeValue = (parseFloat(nativeBalance) / 1e18) * nativePrice;

        let totalValue = nativeValue;
        const debugValues = { native: nativeValue, tokens: {} }; // Debug tracking

        // Calculate token values using symbol-based data
        const addressTokens = erc20Balances.get(address) || new Map();

        tokenAddresses.forEach(tokenAddr => {
          const tokenData = addressTokens.get(tokenAddr) || { balance: '0' };

          // Get token metadata (includes decimals from tokens file)
          const tokenMetadata = addressToTokenMap[tokenAddr.toLowerCase()];
          if (!tokenMetadata || !tokenMetadata.decimals) {
            return; // Skip if no token metadata or decimals
          }

          // Get symbol for this address
          const symbol = tokenMetadata.symbol;
          if (!symbol) {
            return; // Skip if no symbol
          }

          // Get symbol data (price only, not decimals)
          const symbolData = symbolDataMap.get(symbol.toLowerCase());
          if (!symbolData) {
            return; // Skip if no symbol data (price)
          }

          const decimals = tokenMetadata.decimals;  // Use decimals from tokens file
          const price = symbolData.price;           // Use price from symbol_prices table

          // Use BigInt to avoid precision loss for large wei values
          // Divide first as BigInt, then convert to Number for decimal precision
          try {
            const balanceBigInt = BigInt(tokenData.balance);
            const divisor = BigInt(10) ** BigInt(decimals);

            // Perform integer division with BigInt to avoid overflow
            const integerPart = balanceBigInt / divisor;
            const remainder = balanceBigInt % divisor;

            // Convert to decimal: integerPart + (remainder / divisor)
            const balanceInUnits = Number(integerPart) + (Number(remainder) / Number(divisor));
            const value = balanceInUnits * price;

            // DEBUG: Track token values and warn on abnormal values
            // Use token address as key to avoid symbol collision (e.g., IBC appears 3 times)
            const debugKey = `${symbol}-${tokenAddr.substring(0, 10)}`;  // symbol + short addr for uniqueness
            debugValues.tokens[debugKey] = {
              rawBalance: tokenData.balance,
              balanceInUnits,
              price,
              value,
              tokenAddr
            };

            // Warn if balance string is abnormally long (>30 digits)
            if (tokenData.balance.length > 30) {
              this.log(`🔍 [FUND-DEBUG][${address}] Abnormal ${symbol} balance detected:`, 'warn');
              this.log(`   Raw: ${tokenData.balance} (${tokenData.balance.length} digits)`, 'warn');
              this.log(`   Units: ${balanceInUnits}`, 'warn');
              this.log(`   Price: $${price}`, 'warn');
              this.log(`   Value: $${value}`, 'warn');
            }

            totalValue += value;
          } catch (err) {
            // If BigInt conversion fails, skip this token
            this.log(`⚠️  Failed to parse balance for token ${symbol} at ${address}: ${err.message}`, 'warn');
          }
        });

        // DEBUG: Log if total fund is abnormally large
        const finalFundUsd = Number.isFinite(totalValue) ? totalValue : 0;
        const finalFund = Math.floor(finalFundUsd);
        if (finalFund > 10000000) { // > 10M USD
          this.log(`🔍 [FUND-DEBUG][${address}] Large fund value detected: $${finalFund.toLocaleString()}`, 'warn');
          this.log(`   Native: $${debugValues.native.toFixed(2)}`, 'warn');
          this.log(`   Token values:`, 'warn');
          Object.entries(debugValues.tokens).forEach(([symbol, data]) => {
            this.log(`     ${symbol}: ${data.balanceInUnits} × $${data.price} = $${data.value.toFixed(2)}`, 'warn');
          });
        }

        return {
          address: normalizeAddress(address),
          network: this.network,
          fund: finalFund,
          fundUsd: finalFundUsd.toFixed(8),
          lastFundUpdated: this.currentTime,
          nativeBalance: nativeBalance
        };
      });

      // Batch database updates (use batchUpdateFunds to avoid overwriting verified, contract_name, etc.)
      if (updates.length > 0) {
        await batchUpdateFunds(this.db, updates, { batchSize: 250 });
      }

      return updates.length;
    };

      return this.processBatch(addresses, processor, {
      batchSize: this.batchSizes.addresses,
      concurrency: 3,
      delayMs: Number(process.env.PUBLIC_RPC_BATCH_DELAY_MS || 500)
    });
  }



  async run() {
    this.log('🚀 Starting fund update process');

    this.log('📋 Getting outdated addresses...');
    const addresses = await this.getOutdatedAddresses();
    
    if (addresses.length === 0) {
      this.log('✅ No addresses need fund updates');
      return;
    }

    this.log(`📊 Found ${addresses.length} addresses requiring updates`);

    const results = await this.updateAddressFunds(addresses);
    const totalUpdated = results.reduce((sum, count) => sum + count, 0);
    
    this.log(`Updated ${totalUpdated} addresses successfully`);
  }
}

// Execute if run directly
if (require.main === module) {
  // Ensure process exits after completion
  process.env.AUTO_EXIT = 'true';

  // Get network from command line args or environment
  const network = process.argv[2] || process.env.NETWORK || 'ethereum';

  const scanner = new FundUpdater(network);
  scanner.execute()
    .then(() => {
      console.log('✅ FundUpdater completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Scanner failed:', error);
      process.exit(1);
    });
}

module.exports = FundUpdater;
