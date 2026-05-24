/**
 * Simplified Network Configuration
 * Centralized network settings with environment override support
 */

// Load environment variables from .env file
require('dotenv').config();

// Environment variable helper for arrays
const envArray = (name, fallback = []) => {
  const value = process.env[name];
  return value ? value.split(/[,\s]+/).filter(Boolean) : fallback;
};

// Public-RPC-only is the production default. Private/keyed RPCs may be used
// only by explicitly setting PUBLIC_RPC_ONLY=false in a private environment.
const PUBLIC_RPC_ONLY = process.env.PUBLIC_RPC_ONLY !== 'false';

const PRIVATE_RPC_PATTERNS = [
  /alchemy/i,
  /infura/i,
  /quiknode/i,
  /quicknode/i,
  /alchemy-blast/i,
  /apikey=/i,
  /api_key=/i,
  /access[-_]?token=/i,
  /auth[-_]?token=/i,
  /\/v3\/[a-z0-9]{16,}/i,
  /\/v2\/[a-z0-9_-]{16,}/i,
];

function isPublicRpcUrl(url) {
  const value = String(url || '').trim();
  if (!value) return false;
  if (/[{}<>$]/.test(value)) return false;
  if (/your[_-]?(key|token|api)/i.test(value)) return false;
  return !PRIVATE_RPC_PATTERNS.some((pattern) => pattern.test(value));
}

function assertPublicRpcUrls(networks = NETWORKS) {
  if (!PUBLIC_RPC_ONLY) return;
  const offenders = [];
  for (const [network, config] of Object.entries(networks)) {
    for (const url of config.rpcUrls || []) {
      if (!isPublicRpcUrl(url)) offenders.push(`${network}: ${url}`);
    }
  }
  if (offenders.length > 0) {
    throw new Error(
      `PUBLIC_RPC_ONLY is enabled, but private/keyed RPC URLs are configured:\n${offenders.join('\n')}`
    );
  }
}

// Logs optimization configurations based on network activity tier and provider tier
// IMPORTANT: public RPCs commonly enforce smaller getLogs ranges and response caps.
// targetLogsPerRequest set to 80-90% of limit for safety margin
//
// Tier-specific optimizations:
// - Free tier: conservative public-RPC range
// - Premium tier: opt-in private/provider range
//
// Density profiles (logs per block):
// - ultra-high-density: 150+ logs/block (Ethereum, Binance)
// - high-density: 50-150 logs/block (Polygon, Base)
// - medium-density: 20-50 logs/block (Optimism, Avalanche)
// - low-density: 5-20 logs/block (Arbitrum, Linea, Scroll, etc.)

const LOGS_OPTIMIZATION = {
  // ============================================
  // FREE TIER PROFILES (10 blocks per request)
  // ============================================

  'high-activity-free': {
    initialBatchSize: 10,        // Start at tier limit
    minBatchSize: 10,            // Cannot go below tier limit
    maxBatchSize: 10,            // Tier constraint
    targetDuration: 10000,        // 10 seconds acceptable response time
    targetLogsPerRequest: 8000,
    fastMultiplier: 1.0,         // No increase possible
    slowMultiplier: 1.0          // Keep at 10
  },

  'medium-activity-free': {
    initialBatchSize: 10,
    minBatchSize: 10,
    maxBatchSize: 10,
    targetDuration: 10000,        // 10 seconds acceptable response time
    targetLogsPerRequest: 8500,
    fastMultiplier: 1.0,
    slowMultiplier: 1.0
  },

  'low-activity-free': {
    initialBatchSize: 10,
    minBatchSize: 10,
    maxBatchSize: 10,
    targetDuration: 8000,
    targetLogsPerRequest: 9000,
    fastMultiplier: 1.0,
    slowMultiplier: 1.0
  },

  // ============================================
  // PAYG/GROWTH TIER PROFILES (Large batches)
  // ============================================

  'high-activity-payg': {
    initialBatchSize: 100,       // Conservative start
    minBatchSize: 20,            // Allow smaller if needed
    maxBatchSize: 1000,          // Increased for efficiency
    targetDuration: 10000,        // 10 seconds acceptable response time
    targetLogsPerRequest: 8000,
    fastMultiplier: 1.5,
    slowMultiplier: 0.7
  },

  'high-activity-premium': {   // Alias for payg
    initialBatchSize: 100,
    minBatchSize: 20,
    maxBatchSize: 1000,
    targetDuration: 10000,        // 10 seconds acceptable response time
    targetLogsPerRequest: 8000,
    fastMultiplier: 1.5,
    slowMultiplier: 0.7
  },

  'medium-activity-payg': {
    initialBatchSize: 500,       // Larger initial batch
    minBatchSize: 50,
    maxBatchSize: 3000,          // Increased for efficiency
    targetDuration: 10000,        // 10 seconds acceptable response time
    targetLogsPerRequest: 8500,
    fastMultiplier: 2.0,
    slowMultiplier: 0.8
  },

  'medium-activity-premium': {
    initialBatchSize: 500,
    minBatchSize: 50,
    maxBatchSize: 3000,
    targetDuration: 10000,        // 10 seconds acceptable response time
    targetLogsPerRequest: 8500,
    fastMultiplier: 2.0,
    slowMultiplier: 0.8
  },

  'low-activity-payg': {
    initialBatchSize: 2000,      // Large initial batch
    minBatchSize: 500,
    maxBatchSize: 10000,         // Very large for low-activity chains
    targetDuration: 8000,
    targetLogsPerRequest: 9000,
    fastMultiplier: 3.0,
    slowMultiplier: 0.9
  },

  'low-activity-premium': {
    initialBatchSize: 2000,
    minBatchSize: 500,
    maxBatchSize: 10000,
    targetDuration: 8000,
    targetLogsPerRequest: 9000,
    fastMultiplier: 3.0,
    slowMultiplier: 0.9
  },

  // ============================================
  // DENSITY-BASED PROFILES (More granular optimization)
  // ============================================

  // Ultra-high density: 150+ logs/block (Ethereum, Binance)
  'ultra-high-density-free': {
    initialBatchSize: 10,
    minBatchSize: 10,
    maxBatchSize: 10,
    targetDuration: 10000,        // 10 seconds acceptable response time
    targetLogsPerRequest: 9000,   // 90% safety margin for common provider response caps
    fastMultiplier: 1.0,
    slowMultiplier: 1.0
  },

  'ultra-high-density-payg': {
    initialBatchSize: 50,         // Start smaller than high-density
    minBatchSize: 10,
    maxBatchSize: 200,            // Increased max for longer acceptable duration
    targetDuration: 10000,        // 10 seconds acceptable response time
    targetLogsPerRequest: 9000,   // 90% safety margin for common provider response caps
    fastMultiplier: 1.5,          // Can increase more aggressively
    slowMultiplier: 0.7
  },

  'ultra-high-density-premium': {
    initialBatchSize: 50,
    minBatchSize: 10,
    maxBatchSize: 200,            // Increased max for longer acceptable duration
    targetDuration: 10000,        // 10 seconds acceptable response time
    targetLogsPerRequest: 9000,   // 90% safety margin for common provider response caps
    fastMultiplier: 1.5,          // Can increase more aggressively
    slowMultiplier: 0.7
  },

  // High density: 50-150 logs/block (Polygon, Base)
  'high-density-free': {
    initialBatchSize: 10,
    minBatchSize: 10,
    maxBatchSize: 10,
    targetDuration: 10000,        // 10 seconds acceptable response time
    targetLogsPerRequest: 7500,
    fastMultiplier: 1.0,
    slowMultiplier: 1.0
  },

  'high-density-payg': {
    initialBatchSize: 100,
    minBatchSize: 20,
    maxBatchSize: 500,            // Moderate max
    targetDuration: 10000,        // 10 seconds acceptable response time
    targetLogsPerRequest: 7500,
    fastMultiplier: 1.4,
    slowMultiplier: 0.7
  },

  'high-density-premium': {
    initialBatchSize: 100,
    minBatchSize: 20,
    maxBatchSize: 500,
    targetDuration: 10000,        // 10 seconds acceptable response time
    targetLogsPerRequest: 7500,
    fastMultiplier: 1.4,
    slowMultiplier: 0.7
  },

  // Medium density: 20-50 logs/block (Optimism, Avalanche)
  'medium-density-free': {
    initialBatchSize: 10,
    minBatchSize: 10,
    maxBatchSize: 10,
    targetDuration: 10000,        // 10 seconds acceptable response time
    targetLogsPerRequest: 8500,
    fastMultiplier: 1.0,
    slowMultiplier: 1.0
  },

  'medium-density-payg': {
    initialBatchSize: 300,
    minBatchSize: 50,
    maxBatchSize: 2000,
    targetDuration: 10000,        // 10 seconds acceptable response time
    targetLogsPerRequest: 8500,
    fastMultiplier: 1.8,
    slowMultiplier: 0.8
  },

  'medium-density-premium': {
    initialBatchSize: 300,
    minBatchSize: 50,
    maxBatchSize: 2000,
    targetDuration: 10000,        // 10 seconds acceptable response time
    targetLogsPerRequest: 8500,
    fastMultiplier: 1.8,
    slowMultiplier: 0.8
  },

  // Low density: 5-20 logs/block (Arbitrum, Linea, Scroll, etc.)
  'low-density-free': {
    initialBatchSize: 10,
    minBatchSize: 10,
    maxBatchSize: 10,
    targetDuration: 10000,        // 10 seconds acceptable response time
    targetLogsPerRequest: 9000,
    fastMultiplier: 1.0,
    slowMultiplier: 1.0
  },

  'low-density-payg': {
    initialBatchSize: 1000,       // Start large for low-density chains
    minBatchSize: 200,
    maxBatchSize: 10000,          // Very large batches possible (10K block limit)
    targetDuration: 10000,        // 10 seconds acceptable response time
    targetLogsPerRequest: 9000,
    fastMultiplier: 2.5,
    slowMultiplier: 0.9
  },

  'low-density-premium': {
    initialBatchSize: 1000,
    minBatchSize: 200,
    maxBatchSize: 10000,          // Very large batches possible (10K block limit)
    targetDuration: 10000,        // 10 seconds acceptable response time
    targetLogsPerRequest: 9000,
    fastMultiplier: 2.5,
    slowMultiplier: 0.9
  },

  // ============================================
  // LEGACY PROFILES (For backward compatibility)
  // These map to density profiles for existing configurations
  // ============================================

  'high-activity': {
    initialBatchSize: 100,
    minBatchSize: 10,
    maxBatchSize: 500,
    targetDuration: 10000,        // 10 seconds acceptable response time
    targetLogsPerRequest: 8000,
    fastMultiplier: 1.5,
    slowMultiplier: 0.7
  },

  'medium-activity': {
    initialBatchSize: 500,
    minBatchSize: 50,
    maxBatchSize: 2000,
    targetDuration: 10000,        // 10 seconds acceptable response time
    targetLogsPerRequest: 8500,
    fastMultiplier: 2.0,
    slowMultiplier: 0.8
  },

  'low-activity': {
    initialBatchSize: 2000,
    minBatchSize: 500,
    maxBatchSize: 10000,
    targetDuration: 8000,
    targetLogsPerRequest: 9000,
    fastMultiplier: 3.0,
    slowMultiplier: 0.9
  }
};

/**
 * Get optimized logs configuration based on activity profile and detected provider tier
 * @param {string} activityProfile - 'high-activity', 'medium-activity', or 'low-activity'
 * @param {string} alchemyTier - 'free', 'payg', 'premium', or 'growth'
 * @returns {object} Optimized configuration for the given profile and tier
 */
const getLogsOptimization = (activityProfile, alchemyTier) => {
  // Normalize tier names (payg, growth, premium all use same config)
  const normalizedTier = (alchemyTier === 'free') ? 'free' : 'payg';

  // Try different tier variants in order of preference
  const tierVariants = [
    `${activityProfile}-${alchemyTier}`,  // Try exact match first (e.g., high-activity-premium)
    `${activityProfile}-${normalizedTier}` // Then try normalized (e.g., high-activity-payg)
  ];

  // Try each variant
  for (const variant of tierVariants) {
    if (LOGS_OPTIMIZATION[variant]) {
      return LOGS_OPTIMIZATION[variant];
    }
  }

  // Fallback to legacy profile (for backward compatibility)
  if (LOGS_OPTIMIZATION[activityProfile]) {
    return LOGS_OPTIMIZATION[activityProfile];
  }

  // Final fallback to medium-activity
  console.warn(`Unknown activity profile: ${activityProfile}, falling back to medium-activity`);
  return LOGS_OPTIMIZATION[`medium-activity-${normalizedTier}`] || LOGS_OPTIMIZATION['medium-activity'];
};

// Default API keys - now loaded from environment variables
const DEFAULT_ETHERSCAN_KEYS = envArray('DEFAULT_ETHERSCAN_KEYS', []);

// Script timeout settings (seconds)
const TIMEOUT_SECONDS = 7200;
const TIMEOUT_KILL_AFTER = 15;

// Network configurations
const NETWORKS = {
  ethereum: {
    chainId: 1,
    name: 'Ethereum Mainnet',
    alchemyNetwork: 'eth-mainnet',
    explorerApiUrl: 'https://api.etherscan.io/api',

    rpcUrls: envArray('ETHEREUM_RPC_URL', [
      // Public no-key RPCs only.
      'https://rpc.mevblocker.io',
      'https://rpc.flashbots.net',
      'https://eth.drpc.org',
      'https://eth-mainnet.public.blastapi.io',
      'https://eth.api.onfinality.io/public',
      'https://eth.blockrazor.xyz',
      'https://rpc.eth.gateway.fm'
    ].filter(Boolean)),
    apiKeys: DEFAULT_ETHERSCAN_KEYS,
    contractValidator: '0xfE53a230a2AEd6E52f2dEf488DA408d47a80A8bF',
    nativeCurrency: 'ETH',
    BalanceHelper: '0xF6eDe5F60e6fB769F7571Ad635bF1Db0735a7386',
    // getLogs block range limits
    maxLogsBlockRange: {
      free: 10,          // Free tier
      premium: 999999    // Premium/PAYG/Growth tier (unlimited for Ethereum)
    },
    // Logs optimization configuration
    // Ethereum has ultra-high log density (150+ logs/block)
    // Use string profile name, Scanner will apply tier-specific optimization
    logsOptimization: 'ultra-high-density'
  },

  binance: {
    chainId: 56,
    name: 'BNB Smart Chain',
    alchemyNetwork: 'bnb-mainnet',
    explorerApiUrl: 'https://api.bscscan.com/api',

    rpcUrls: envArray('BSC_RPC_URL', [
      // Public no-key RPCs only.
      'https://bnb.api.onfinality.io/public',
      'https://bsc.drpc.org'
    ].filter(Boolean)),
    apiKeys: DEFAULT_ETHERSCAN_KEYS,
    contractValidator: '0x91Ce20223F35b82E34aC4913615845C7AaA0e2B7',
    nativeCurrency: 'BNB',
    BalanceHelper: '0xf481b013532d38227F57f46217B3696F2Ae592c8',
    maxLogsBlockRange: {
      free: 10,
      premium: 10000     // BSC: 10000 blocks
    },
    // BSC has ultra-high log density similar to Ethereum
    logsOptimization: 'ultra-high-density'
  },

  polygon: {
    chainId: 137,
    name: 'Polygon',
    alchemyNetwork: 'polygon-mainnet',
    explorerApiUrl: 'https://api.polygonscan.com/api',

    rpcUrls: envArray('POLYGON_RPC_URL', [
      // Public no-key RPCs only.
      'https://polygon.drpc.org',
      'https://polygon-public.nodies.app',
      'https://polygon.api.onfinality.io/public',
      'https://gateway.tenderly.co/public/polygon'
    ].filter(Boolean)),
    apiKeys: DEFAULT_ETHERSCAN_KEYS,
    contractValidator: '0xC7bAd40fE8c4B8aA380cBfAE63B9b39a9684F8B4',
    nativeCurrency: 'MATIC',
    BalanceHelper: '0xC55d7D06b3651816ea51700CB91235cd60Dd4d7D',
    maxLogsBlockRange: {
      free: 10,
      premium: 2000      // Polygon: 2000 blocks
    },
    // Polygon has high log density (50-150 logs/block)
    logsOptimization: 'high-density'
  },

  arbitrum: {
    chainId: 42161,
    name: 'Arbitrum One',
    alchemyNetwork: 'arb-mainnet',
    explorerApiUrl: 'https://api.arbiscan.io/api',

    rpcUrls: envArray('ARBITRUM_RPC_URL', [
      // Public no-key RPCs only.
      'https://arbitrum-one.public.blastapi.io',
      'https://arb1.arbitrum.io/rpc',
      'https://arbitrum.gateway.tenderly.co'
    ].filter(Boolean)),
    apiKeys: DEFAULT_ETHERSCAN_KEYS,
    contractValidator: '0x20f776Bd5FA50822fb872573C80453dA18A8CA34',
    nativeCurrency: 'ETH',
    BalanceHelper: '0xdD5cFc64f74B2b5A4e80031DDf84597be449E3E3',
    maxLogsBlockRange: {
      free: 10,
      premium: 999999    // Arbitrum (Layer 2): unlimited
    },
    // Arbitrum has low log density (5-20 logs/block)
    logsOptimization: 'low-density'
  },

  optimism: {
    chainId: 10,
    name: 'Optimism',
    alchemyNetwork: 'opt-mainnet',
    explorerApiUrl: 'https://api-optimistic.etherscan.io/api',

    rpcUrls: envArray('OPTIMISM_RPC_URL', [
      // Public no-key RPCs only.
      'https://optimism-public.nodies.app',
      'https://mainnet.optimism.io',
      'https://optimism.drpc.org',
      'https://optimism.gateway.tenderly.co',
      'https://gateway.tenderly.co/public/optimism'
    ].filter(Boolean)),
    apiKeys: DEFAULT_ETHERSCAN_KEYS,
    contractValidator: '0xeAbB01920C41e1C010ba74628996EEA65Df03550',
    nativeCurrency: 'ETH',
    BalanceHelper: '0x3d2104Da2B23562c47DCAE9EefE5063b6aB5c637',
    maxLogsBlockRange: {
      free: 10,
      premium: 999999    // Optimism (Layer 2): unlimited
    },
    // Optimism has medium log density (20-50 logs/block)
    logsOptimization: 'medium-density'
  },

  base: {
    chainId: 8453,
    name: 'Base',
    alchemyNetwork: 'base-mainnet',
    explorerApiUrl: 'https://api.basescan.org/api',

    rpcUrls: envArray('BASE_RPC_URL', [
      // Public no-key RPCs only.
      'https://base-public.nodies.app',
      'https://base.gateway.tenderly.co',
      'https://mainnet.base.org',
      'https://developer-access-mainnet.base.org',
      'https://base-mainnet.public.blastapi.io',
      'https://base-pokt.nodies.app',
      'https://gateway.tenderly.co/public/base'
    ].filter(Boolean)),
    apiKeys: DEFAULT_ETHERSCAN_KEYS,
    contractValidator: '0x6F4A97C44669a74Ee6b6EE95D2cD6C4803F6b384',
    nativeCurrency: 'ETH',
    BalanceHelper: '0xa3ba28ccDDa4Ba986F20E395D41F5bb37F8f900d',
    maxLogsBlockRange: {
      free: 10,
      premium: 999999    // Base (Layer 2): unlimited
    },
    // Base has high log density (50-150 logs/block)
    logsOptimization: 'high-density'
  },

  avalanche: {
    chainId: 43114,
    name: 'Avalanche C-Chain',
    alchemyNetwork: 'avax-mainnet',
    explorerApiUrl: 'https://api.snowtrace.io/api',

    rpcUrls: envArray('AVALANCHE_RPC_URL', [
      // Public no-key RPCs only.
      'https://api.avax.network/ext/bc/C/rpc',
      'https://avalanche.drpc.org'
    ].filter(Boolean)),
    apiKeys: DEFAULT_ETHERSCAN_KEYS,
    contractValidator: '0x235a064473515789e2781B051bbd9e24AFb46DAc',
    nativeCurrency: 'AVAX',
    BalanceHelper: '0xa3ba28ccDDa4Ba986F20E395D41F5bb37F8f900d',
    maxLogsBlockRange: {
      free: 10,
      premium: 10000     // All Other Chains: 10000 blocks
    },
    // Avalanche has medium log density (20-50 logs/block)
    logsOptimization: 'medium-density'
  }
};

// Additional networks with proper configurations
const ADDITIONAL_NETWORKS = {
  gnosis: {
    chainId: 100,
    name: 'Gnosis Chain',
    alchemyNetwork: 'gnosis-mainnet',
    // Gnosis uses Etherscan v2 API - Gnosisscan deprecated V1 endpoint
    // explorerApiUrl: 'https://api.gnosisscan.io/api',

    rpcUrls: envArray('GNOSIS_RPC_URL', [
      'https://gnosis.drpc.org',
      'https://gnosis-public.nodies.app'
    ].filter(Boolean)),
    contractValidator: '0x06318Df33cea02503afc45FE65cdEAb8FAb3E20A',
    nativeCurrency: 'xDAI',
    BalanceHelper: '0x510E86Be47994b0Fbc9aEF854B83d2f8906F7AD7',
    maxLogsBlockRange: {
      free: 10,
      premium: 10000     // All Other Chains: 10000 blocks
    },
    // Gnosis has low log density (5-20 logs/block)
    logsOptimization: 'low-density'
  },

  linea: {
    chainId: 59144,
    name: 'Linea',
    alchemyNetwork: 'linea-mainnet',
    // Linea supports Etherscan v2 API - use v2 to avoid separate API key
    // explorerApiUrl: 'https://api.lineascan.build/api',

    rpcUrls: envArray('LINEA_RPC_URL', [
      'https://rpc.linea.build',
      'https://linea.drpc.org'
    ].filter(Boolean)),
    contractValidator: '0xeabb01920c41e1c010ba74628996eea65df03550',
    nativeCurrency: 'ETH',
    BalanceHelper: '0x06318Df33cea02503afc45FE65cdEAb8FAb3E20A',
    maxLogsBlockRange: {
      free: 10,
      premium: 10000     // All Other Chains: 10000 blocks
    },
    // Linea has low log density (5-20 logs/block)
    logsOptimization: 'low-density'
  },

  scroll: {
    chainId: 534352,
    name: 'Scroll',
    alchemyNetwork: 'scroll-mainnet',
    // Scroll uses Etherscan v2 API - avoids separate API key requirement
    // explorerApiUrl: 'https://api.scrollscan.com/api',

    rpcUrls: envArray('SCROLL_RPC_URL', [
      'https://rpc.scroll.io',
      'https://scroll.drpc.org'
    ].filter(Boolean)),
    contractValidator: '0xeAbB01920C41e1C010ba74628996EEA65Df03550',
    nativeCurrency: 'ETH',
    BalanceHelper: '0x06318Df33cea02503afc45FE65cdEAb8FAb3E20A',
    maxLogsBlockRange: {
      free: 10,
      premium: 10000     // All Other Chains: 10000 blocks
    },
    // Scroll has low log density (5-20 logs/block)
    logsOptimization: 'low-density'
  },

  mantle: {
    chainId: 5000,
    name: 'Mantle',
    alchemyNetwork: 'mantle-mainnet',
    // Mantle supports Etherscan v2 API - use v2 to avoid separate API key
    // explorerApiUrl: 'https://api.mantlescan.info/api',

    rpcUrls: envArray('MANTLE_RPC_URL', [
      'https://rpc.mantle.xyz',
      'https://mantle.drpc.org'
    ].filter(Boolean)),
    contractValidator: '0x235a064473515789e2781B051bbd9e24AFb46DAc',
    nativeCurrency: 'MNT',
    BalanceHelper: '0xeAbB01920C41e1C010ba74628996EEA65Df03550',
    maxLogsBlockRange: {
      free: 10,
      premium: 10000     // All Other Chains: 10000 blocks
    },
    // Mantle has low log density (5-20 logs/block)
    logsOptimization: 'low-density'
  },

  unichain: {
    chainId: 130,
    name: 'Unichain',
    alchemyNetwork: 'unichain-mainnet',
    // Unichain uses Etherscan v2 API - avoids separate API key requirement
    // explorerApiUrl: 'https://api.uniscan.xyz/api',

    rpcUrls: envArray('UNICHAIN_RPC_URL', [
      'https://mainnet.unichain.org',
      'https://unichain.drpc.org',
      'https://unichain.gateway.tenderly.co'
    ].filter(Boolean)),
    contractValidator: '0x235a064473515789e2781B051bbd9e24AFb46DAc',
    nativeCurrency: 'ETH',
    BalanceHelper: '0x6F4A97C44669a74Ee6b6EE95D2cD6C4803F6b384',
    maxLogsBlockRange: {
      free: 10,
      premium: 10000     // All Other Chains: 10000 blocks
    },
    // Unichain has low log density (5-20 logs/block)
    logsOptimization: 'low-density'
  },

  berachain: {
    chainId: 80094,
    name: 'Berachain',
    alchemyNetwork: 'berachain-mainnet',
    // Berachain uses Etherscan v2 API - avoids separate API key requirement
    // explorerApiUrl: 'https://api.berascan.com/api',

    rpcUrls: envArray('BERACHAIN_RPC_URL', [
      'https://rpc.berachain.com',
      'https://berachain.drpc.org'
    ].filter(Boolean)),
    contractValidator: '0x235a064473515789e2781B051bbd9e24AFb46DAc',
    nativeCurrency: 'BERA',
    BalanceHelper: '0x6F4A97C44669a74Ee6b6EE95D2cD6C4803F6b384',
    maxLogsBlockRange: {
      free: 10,
      premium: 10000     // All Other Chains: 10000 blocks
    },
    // Berachain has low log density (5-20 logs/block)
    logsOptimization: 'low-density'
  },

  'arbitrum-nova': {
    chainId: 42170,
    name: 'Arbitrum Nova',
    alchemyNetwork: 'arbnova-mainnet',
    rpcUrls: envArray('ARBITRUM_NOVA_RPC_URL', [
      'https://nova.arbitrum.io/rpc'
    ].filter(Boolean)),
    contractValidator: '0x235a064473515789e2781B051bbd9e24AFb46DAc',
    nativeCurrency: 'ETH',
    BalanceHelper: '0xeAbB01920C41e1C010ba74628996EEA65Df03550',
    maxLogsBlockRange: { free: 10, premium: 10000 },
    logsOptimization: 'low-density'
  },

  celo: {
    chainId: 42220,
    name: 'Celo Mainnet',
    alchemyNetwork: 'celo-mainnet',
    rpcUrls: envArray('CELO_RPC_URL', [
      'https://forno.celo.org'
    ].filter(Boolean)),
    contractValidator: '0x235a064473515789e2781B051bbd9e24AFb46DAc',
    nativeCurrency: 'CELO',
    BalanceHelper: '0xeAbB01920C41e1C010ba74628996EEA65Df03550',
    maxLogsBlockRange: { free: 10, premium: 10000 },
    logsOptimization: 'medium-density'
  },

  cronos: {
    chainId: 25,
    name: 'Cronos',
    alchemyNetwork: 'cronos-mainnet',
    rpcUrls: envArray('CRONOS_RPC_URL', [
      'https://evm.cronos.org',
      'https://cronos.drpc.org'
    ].filter(Boolean)),
    contractValidator: '0x235a064473515789e2781B051bbd9e24AFb46DAc',
    nativeCurrency: 'CRO',
    BalanceHelper: '0xeAbB01920C41e1C010ba74628996EEA65Df03550',
    maxLogsBlockRange: { free: 10, premium: 10000 },
    logsOptimization: 'medium-density'
  },

  moonbeam: {
    chainId: 1284,
    name: 'Moonbeam',
    alchemyNetwork: 'moonbeam-mainnet',
    rpcUrls: envArray('MOONBEAM_RPC_URL', [
      // No public no-key endpoint currently passes the full scanner smoke test.
    ].filter(Boolean)),
    contractValidator: '0x235a064473515789e2781B051bbd9e24AFb46DAc',
    nativeCurrency: 'GLMR',
    BalanceHelper: '0xeAbB01920C41e1C010ba74628996EEA65Df03550',
    maxLogsBlockRange: { free: 10, premium: 10000 },
    logsOptimization: 'low-density'
  },

  moonriver: {
    chainId: 1285,
    name: 'Moonriver',
    alchemyNetwork: 'moonriver-mainnet',
    rpcUrls: envArray('MOONRIVER_RPC_URL', [
      // No public no-key endpoint currently passes the full scanner smoke test.
    ].filter(Boolean)),
    contractValidator: '0x235a064473515789e2781B051bbd9e24AFb46DAc',
    nativeCurrency: 'MOVR',
    BalanceHelper: '0xeAbB01920C41e1C010ba74628996EEA65Df03550',
    maxLogsBlockRange: { free: 10, premium: 10000 },
    logsOptimization: 'low-density'
  },

  opbnb: {
    chainId: 204,
    name: 'opBNB',
    alchemyNetwork: 'opbnb-mainnet',
    rpcUrls: envArray('OPBNB_RPC_URL', [
      'https://opbnb-mainnet-rpc.bnbchain.org',
      'https://opbnb.drpc.org'
    ].filter(Boolean)),
    contractValidator: '0x235a064473515789e2781B051bbd9e24AFb46DAc',
    nativeCurrency: 'BNB',
    BalanceHelper: '0xeAbB01920C41e1C010ba74628996EEA65Df03550',
    maxLogsBlockRange: { free: 10, premium: 10000 },
    logsOptimization: 'medium-density'
  },

  'polygon-zkevm': {
    chainId: 1101,
    name: 'Polygon zkEVM',
    alchemyNetwork: 'polygon-zkevm-mainnet',
    rpcUrls: envArray('POLYGON_ZKEVM_RPC_URL', [
      'https://zkevm-rpc.com',
      'https://polygon-zkevm.drpc.org'
    ].filter(Boolean)),
    contractValidator: '0x235a064473515789e2781B051bbd9e24AFb46DAc',
    nativeCurrency: 'ETH',
    BalanceHelper: '0xeAbB01920C41e1C010ba74628996EEA65Df03550',
    maxLogsBlockRange: { free: 10, premium: 10000 },
    logsOptimization: 'low-density'
  },

  megaeth: {
    chainId: 4326,
    name: 'MegaETH Mainnet',
    alchemyNetwork: 'megaeth-mainnet',
    // MegaETH uses Etherscan v2 API - avoids separate API key requirement
    // explorerApiUrl: 'https://api.mega.etherscan.io/api',

    rpcUrls: envArray('MEGAETH_RPC_URL', [
      'https://mainnet.megaeth.com/rpc',
      'https://megaeth.drpc.org'
    ].filter(Boolean)),
    // No contractValidator on MegaETH - scanner uses individual eth_getCode (correct contract detection)
    nativeCurrency: 'ETH',
    BalanceHelper: '0x6F4A97C44669a74Ee6b6EE95D2cD6C4803F6b384', 
    maxLogsBlockRange: {
      free: 10,
      premium: 10000     // All Other Chains: 10000 blocks
    },
    // MegaETH has low log density (5-20 logs/block)
    logsOptimization: 'low-density'
  },

  subtensor: {
    chainId: 964,
    name: 'Bittensor EVM',
    // Public RPC fallbacks for Bittensor EVM.
    explorerApiUrl: 'https://evm.taostats.io/api',
    // Bittensor's Blockscout-based explorer is not on Etherscan v2's chain list.
    // Routes contract/account calls to evm.taostats.io and proxy calls through JSON-RPC.
    useDedicatedExplorer: true,

    rpcUrls: envArray('SUBTENSOR_RPC_URL', [
      'https://lite.chain.opentensor.ai',
      'https://entrypoint-finney.opentensor.ai'
    ].filter(Boolean)),
    // contractValidator omitted - scanner falls back to per-address eth_getCode (MegaETH pattern).
    // BalanceHelper omitted - FundUpdater falls back to individual eth_getBalance calls.
    nativeCurrency: 'TAO',
    maxLogsBlockRange: {
      free: 10,
      premium: 10000
    },
    // Bittensor has low log density (5-20 logs/block)
    logsOptimization: 'low-density'
  },

  sui: {
    chainId: 0, // Sui doesn't use EVM chainId
    name: 'Sui Network',
    chainType: 'move', // Non-EVM blockchain
    suiNetwork: 'mainnet',

    rpcUrls: envArray('SUI_RPC_URL', [
      'https://fullnode.mainnet.sui.io:443'
    ].filter(Boolean)),
    nativeCurrency: 'SUI',
    // Sui-specific: no contract validator or balance helper (Move blockchain)
    maxLogsBlockRange: {
      free: 1000,        // Events per query
      premium: 1000      // Sui max events per query
    }
  }
};


// Apply configuration to additional networks
Object.entries(ADDITIONAL_NETWORKS).forEach(([key, config]) => {
  NETWORKS[key] = {
    ...config,
    apiKeys: DEFAULT_ETHERSCAN_KEYS
  };
});

assertPublicRpcUrls(NETWORKS);

// Global settings
const CONFIG = {
  // Time settings (in hours/days) - can be overridden by env vars
  TIMEDELAY: parseInt(process.env.TIMEDELAY_HOURS || '4', 10),
  FUNDUPDATEDELAY: parseInt(process.env.FUNDUPDATEDELAY_DAYS || '7', 10),
  
  // Script timeout settings
  TIMEOUT_SECONDS: parseInt(process.env.TIMEOUT_SECONDS || TIMEOUT_SECONDS.toString(), 10),
  TIMEOUT_KILL_AFTER: parseInt(process.env.TIMEOUT_KILL_AFTER || TIMEOUT_KILL_AFTER.toString(), 10),
  
  // API settings
  etherscanApiKeys: DEFAULT_ETHERSCAN_KEYS,
  
  // Database settings (still from env vars for security)
  database: {
    host: process.env.PGHOST || 'localhost',
    port: parseInt(process.env.PGPORT || '5432', 10),
    database: process.env.PGDATABASE || 'bugchain_indexer', 
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || ''
  },
  
  // Advanced options
  runFixDeployed: process.env.RUN_FIX_DEPLOYED === 'true',
  runVerifyContracts: process.env.RUN_VERIFY_CONTRACTS !== 'false', // Default true
  
  // Add all networks
  ...NETWORKS
};

module.exports = {
  NETWORKS,
  CONFIG,
  LOGS_OPTIMIZATION,
  getLogsOptimization,
  isPublicRpcUrl,
  assertPublicRpcUrls,
  PUBLIC_RPC_ONLY
};
