const axios = require('axios');

const SYMBOL_TO_COINGECKO_ID = {
  '1inch': '1inch',
  aave: 'aave',
  aero: 'aerodrome-finance',
  arb: 'arbitrum',
  avax: 'avalanche-2',
  bera: 'berachain-bera',
  bnb: 'binancecoin',
  busd: 'binance-usd',
  cbeth: 'coinbase-wrapped-staked-eth',
  cbbtc: 'coinbase-wrapped-btc',
  celo: 'celo',
  comp: 'compound-governance-token',
  cro: 'crypto-com-chain',
  crv: 'curve-dao-token',
  dai: 'dai',
  eth: 'ethereum',
  ethfi: 'ether-fi',
  frax: 'frax',
  frxeth: 'frax-ether',
  fxs: 'frax-share',
  glmr: 'moonbeam',
  knc: 'kyber-network-crystal',
  leo: 'leo-token',
  link: 'chainlink',
  matic: 'matic-network',
  mnt: 'mantle',
  movr: 'moonriver',
  op: 'optimism',
  pendle: 'pendle',
  pol: 'polygon-ecosystem-token',
  reth: 'rocket-pool-eth',
  sfrxeth: 'staked-frax-ether',
  snx: 'havven',
  susde: 'ethena-staked-usde',
  tao: 'bittensor',
  usdc: 'usd-coin',
  'usdc.e': 'usd-coin',
  usde: 'ethena-usde',
  usds: 'usds',
  usdt: 'tether',
  w: 'wormhole',
  wavax: 'avalanche-2',
  wbtc: 'wrapped-bitcoin',
  wbeth: 'wrapped-beacon-eth',
  wbnb: 'binancecoin',
  wcelo: 'celo',
  weth: 'ethereum',
  wglmr: 'moonbeam',
  wmatic: 'matic-network',
  wmnt: 'mantle',
  wmovr: 'moonriver',
  wpol: 'polygon-ecosystem-token',
  wsteth: 'wrapped-steth',
  xdai: 'xdai',
  xcdot: 'polkadot',
  xcksm: 'kusama'
};

const STABLE_SYMBOLS = new Set([
  'dai',
  'frax',
  'lusd',
  'mim',
  'usdc',
  'usdc.e',
  'usde',
  'usds',
  'usdt',
  'xdai'
]);

function normalizeSymbol(symbol) {
  return String(symbol || '')
    .trim()
    .replace(/^w(?=eth$|btc$|bnb$|avax$|matic$|mnt$|movr$|glmr$|pol$|celo$)/i, 'w')
    .toLowerCase();
}

function coingeckoIdForSymbol(symbol) {
  const normalized = normalizeSymbol(symbol);
  if (SYMBOL_TO_COINGECKO_ID[normalized]) return SYMBOL_TO_COINGECKO_ID[normalized];

  const withoutSuffix = normalized.split('.')[0];
  if (SYMBOL_TO_COINGECKO_ID[withoutSuffix]) return SYMBOL_TO_COINGECKO_ID[withoutSuffix];

  return null;
}

class CoinGeckoPriceProvider {
  constructor(options = {}) {
    this.baseUrl = (options.baseUrl || process.env.COINGECKO_API_BASE_URL || 'https://api.coingecko.com/api/v3').replace(/\/+$/, '');
    this.timeoutMs = Number(options.timeoutMs || process.env.COINGECKO_TIMEOUT_MS || 15000);
  }

  async fetchPricesBySymbols(symbols) {
    const uniqueSymbols = [...new Set((symbols || []).filter(Boolean))];
    const result = new Map();
    const ids = new Set();
    const symbolToId = new Map();

    for (const symbol of uniqueSymbols) {
      const normalized = normalizeSymbol(symbol);
      if (STABLE_SYMBOLS.has(normalized) || STABLE_SYMBOLS.has(normalized.split('.')[0])) {
        result.set(symbol.toLowerCase(), { price: 1, name: symbol });
        continue;
      }

      const id = coingeckoIdForSymbol(symbol);
      if (id) {
        ids.add(id);
        symbolToId.set(symbol.toLowerCase(), id);
      }
    }

    if (ids.size === 0) return result;

    const response = await axios.get(`${this.baseUrl}/simple/price`, {
      params: {
        ids: [...ids].join(','),
        vs_currencies: 'usd'
      },
      timeout: this.timeoutMs
    });

    for (const [symbolLower, id] of symbolToId) {
      const price = Number(response.data?.[id]?.usd);
      if (Number.isFinite(price) && price > 0) {
        result.set(symbolLower, { price, name: id });
      }
    }

    return result;
  }
}

module.exports = {
  CoinGeckoPriceProvider,
  coingeckoIdForSymbol,
  normalizeSymbol
};
