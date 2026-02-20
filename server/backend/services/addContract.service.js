/**
 * Add Contract Service
 * Validates and stores manually added verified smart contracts via Etherscan API
 */
const path = require('path');

// Load scanners env for DEFAULT_ETHERSCAN_KEYS (must load first)
require('dotenv').config({ path: path.join(__dirname, '../../../scanners/.env') });
// Load backend env (DB, etc.) - do not override existing vars like DEFAULT_ETHERSCAN_KEYS
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { pool } = require('./db');
const { NETWORKS } = require('../../../scanners/config/networks');
const {
  etherscanRequest,
  getContractEtherscanEnrichment,
} = require('../../../scanners/common/core');
const {
  batchUpsertAddresses,
  batchUpsertContractSources,
} = require('../../../scanners/common/database');

const EVM_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

function normalizeAddress(addr) {
  if (!addr || typeof addr !== 'string') return null;
  return addr.trim().toLowerCase();
}

function isValidEvmAddress(address) {
  const normalized = normalizeAddress(address);
  return normalized && EVM_ADDRESS_REGEX.test(normalized);
}

async function addContract(address, network) {
  const normalizedAddr = normalizeAddress(address);
  const normalizedNetwork = (network || '').trim().toLowerCase();

  // 1. Validate inputs
  if (!isValidEvmAddress(address)) {
    return { ok: false, error: 'Invalid contract address' };
  }

  const config = NETWORKS[normalizedNetwork];
  if (!config || !config.chainId) {
    return { ok: false, error: 'Unsupported network' };
  }

  const scanner = {
    network: normalizedNetwork,
    etherscanCall: (params) => etherscanRequest(normalizedNetwork, params),
  };

  try {
    // 2. Check: Is it a smart contract?
    const codeResult = await etherscanRequest(normalizedNetwork, {
      module: 'proxy',
      action: 'eth_getCode',
      address: normalizedAddr,
      tag: 'latest',
    });

    const code = typeof codeResult === 'string' ? codeResult : String(codeResult || '');
    if (!code || code === '0x' || code === '0x0') {
      return { ok: false, error: 'Address is not a smart contract (EOA)' };
    }

    // 3. Get verified + source code via enrichment
    const enrichment = await getContractEtherscanEnrichment(scanner, normalizedAddr);

    if (!enrichment.verified) {
      return { ok: false, error: 'Contract is not verified' };
    }

    const sourceCode = enrichment.sourceCode?.trim();
    if (!sourceCode) {
      return { ok: false, error: 'Contract is not verified / missing source code' };
    }

    // 4. Fetch native balance
    let nativeBalance = '0';
    try {
      const balanceResult = await etherscanRequest(normalizedNetwork, {
        module: 'proxy',
        action: 'eth_getBalance',
        address: normalizedAddr,
        tag: 'latest',
      });
      const balanceHex = typeof balanceResult === 'string' ? balanceResult : String(balanceResult || '0x0');
      try {
        nativeBalance = BigInt(balanceHex.startsWith('0x') ? balanceHex : '0x' + balanceHex).toString();
      } catch {
        nativeBalance = '0';
      }
    } catch (err) {
      // Non-fatal: continue with 0 balance
      nativeBalance = '0';
    }

    // 5. Store in database
    const now = Math.floor(Date.now() / 1000);
    const addressRecord = {
      address: normalizedAddr,
      network: normalizedNetwork,
      codeHash: null,
      contractName: enrichment.contractName || null,
      verified: true,
      isProxy: enrichment.isProxy || false,
      implementationAddress: enrichment.implementationAddress || null,
      proxyContractName: enrichment.proxyContractName || null,
      implementationContractName: enrichment.implementationContractName || null,
      deployTxHash: enrichment.deployTxHash || null,
      deployerAddress: enrichment.deployerAddress || null,
      deployBlockNumber: enrichment.deployBlockNumber || null,
      deployedAtTimestamp: enrichment.deployedAtTimestamp || null,
      deployedAt: enrichment.deployedAt || null,
      confidence: enrichment.confidence || null,
      fetchedAt: enrichment.fetchedAt || null,
      deployed: enrichment.deployedAtTimestamp || null,
      lastUpdated: now,
      firstSeen: now,
      tags: ['Contract'],
      fund: 0,
      lastFundUpdated: 0,
      nameChecked: true,
      nameCheckedAt: now,
      nativeBalance: nativeBalance || '0',
    };

    const sourceRecord = {
      address: normalizedAddr,
      network: normalizedNetwork,
      sourceCode,
      sourceCodeHash: null,
      compilerVersion: enrichment.compilerVersion || null,
      optimizationUsed: enrichment.optimizationUsed || null,
      runs: enrichment.runs != null ? enrichment.runs : null,
      abi: enrichment.abi || null,
      contractFileName: enrichment.contractFileName || null,
      compilerType: enrichment.compilerType || null,
      evmVersion: enrichment.evmVersion || null,
      constructorArguments: enrichment.constructorArguments || null,
      library: enrichment.library || null,
      licenseType: enrichment.licenseType || null,
    };

    const client = await pool.connect();
    try {
      await batchUpsertAddresses(client, [addressRecord], { batchSize: 1 });
      await batchUpsertContractSources(client, [sourceRecord], { batchSize: 1 });
    } finally {
      client.release();
    }

    return {
      ok: true,
      contract: {
        address: normalizedAddr,
        network: normalizedNetwork,
        contract_name: enrichment.contractName,
        verified: true,
        deployed: enrichment.deployedAtTimestamp,
        native_balance: nativeBalance,
      },
    };
  } catch (err) {
    const msg = String(err?.message || err);
    console.error('[addContract] Error for', normalizedAddr, 'on', normalizedNetwork, ':', msg);
    if (
      msg.includes('rate limit') ||
      msg.includes('Max rate limit') ||
      msg.includes('429')
    ) {
      return { ok: false, error: 'Block explorer rate limit reached. Please try again later.' };
    }
    if (msg.includes('No Etherscan API keys') || msg.includes('No Etherscan API keys configured')) {
      return { ok: false, error: 'Block explorer API not configured. Please set DEFAULT_ETHERSCAN_KEYS in scanners/.env.' };
    }
    if (msg.includes('timeout') || msg.includes('ETIMEDOUT') || msg.includes('ECONNABORTED')) {
      return { ok: false, error: 'Block explorer request timed out. Please try again.' };
    }
    if (msg.includes('ECONNREFUSED') || msg.includes('ENOTFOUND')) {
      return { ok: false, error: 'Cannot reach block explorer. Check your network connection.' };
    }
    return { ok: false, error: 'Failed to fetch contract data from block explorer' };
  }
}

module.exports = { addContract };
