#!/usr/bin/env node
/* eslint-disable no-console */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const axios = require('axios');
const { NETWORKS, isPublicRpcUrl } = require('../config/networks');

const TIMEOUT_MS = Number(process.env.RPC_VALIDATE_TIMEOUT_MS || 10000);
const NETWORK_FILTER = (process.env.NETWORKS || process.env.NETWORK || '')
  .split(/[,\s]+/)
  .map((s) => s.trim())
  .filter(Boolean);

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

async function rpc(url, method, params = []) {
  const response = await axios.post(
    url,
    { jsonrpc: '2.0', id: `${method}-${Date.now()}`, method, params },
    {
      timeout: TIMEOUT_MS,
      headers: { 'Content-Type': 'application/json' },
      validateStatus: (status) => status < 500,
      maxContentLength: 20 * 1024 * 1024,
      maxBodyLength: 20 * 1024 * 1024,
    }
  );
  if (response.data?.error) {
    const msg = response.data.error.message || JSON.stringify(response.data.error);
    throw new Error(`${method}: ${msg}`);
  }
  return response.data?.result;
}

async function validateEndpoint(network, config, url) {
  if (!isPublicRpcUrl(url)) {
    return { ok: false, reason: 'private/keyed URL pattern' };
  }

  const chainIdHex = await rpc(url, 'eth_chainId');
  const chainId = parseInt(chainIdHex, 16);
  if (chainId !== config.chainId) {
    return { ok: false, reason: `chainId ${chainId} != expected ${config.chainId}` };
  }

  const blockHex = await rpc(url, 'eth_blockNumber');
  const block = parseInt(blockHex, 16);
  if (!Number.isFinite(block) || block <= 0) {
    return { ok: false, reason: `invalid block ${blockHex}` };
  }

  const from = Math.max(0, block - 1);
  await rpc(url, 'eth_getLogs', [{
    fromBlock: `0x${from.toString(16)}`,
    toBlock: `0x${block.toString(16)}`,
    topics: [],
  }]);
  await rpc(url, 'eth_getCode', [ZERO_ADDRESS, 'latest']);

  try {
    await rpc(url, 'eth_call', [{ to: ZERO_ADDRESS, data: '0x' }, 'latest']);
  } catch (err) {
    const msg = String(err?.message || '');
    if (/method not found|method not supported|not available/i.test(msg)) {
      throw err;
    }
  }

  return { ok: true, block };
}

async function main() {
  const entries = Object.entries(NETWORKS)
    .filter(([name, cfg]) => cfg.chainId && cfg.chainId > 0 && cfg.rpcUrls?.length)
    .filter(([name]) => NETWORK_FILTER.length === 0 || NETWORK_FILTER.includes(name));

  let failures = 0;
  for (const [network, config] of entries) {
    console.log(`\n${network} (${config.chainId})`);
    for (const url of config.rpcUrls) {
      try {
        const result = await validateEndpoint(network, config, url);
        if (result.ok) {
          console.log(`  OK   block=${result.block} ${url}`);
        } else {
          failures++;
          console.log(`  FAIL ${result.reason} ${url}`);
        }
      } catch (err) {
        failures++;
        console.log(`  FAIL ${String(err?.message || err).slice(0, 180)} ${url}`);
      }
    }
  }

  if (failures > 0) {
    console.error(`\nRPC validation completed with ${failures} failure(s).`);
    process.exit(1);
  }
  console.log('\nRPC validation passed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
