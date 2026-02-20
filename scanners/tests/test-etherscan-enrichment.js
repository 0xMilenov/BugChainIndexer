#!/usr/bin/env node

/**
 * Test: Etherscan enrichment fixtures
 *
 * Covers:
 * - Verified non-proxy contract (precise deployment)
 * - Unverified contract (name empty, deployment still resolved)
 * - Proxy contract (proxy + implementation names, canonical from implementation)
 * - Rate limit retry/backoff behavior
 * - Block timestamp caching for repeated block lookups
 */

const assert = require('assert');
const { getContractEtherscanEnrichment } = require('../common/core');

function createMockScanner(handler) {
  return {
    etherscanCall: async (params) => handler(params),
    log: () => {}
  };
}

async function testVerifiedNonProxy() {
  const address = '0x1111111111111111111111111111111111111111';
  const scanner = createMockScanner(async (params) => {
    if (params.module === 'contract' && params.action === 'getsourcecode') {
      return [{ ContractName: 'TokenA', Proxy: '0', Implementation: '' }];
    }
    if (params.module === 'contract' && params.action === 'getcontractcreation') {
      return [{ txHash: '0xaaa', contractCreator: '0xDeployerA' }];
    }
    if (params.module === 'proxy' && params.action === 'eth_getTransactionByHash') {
      return { blockNumber: '0x10' };
    }
    if (params.module === 'proxy' && params.action === 'eth_getBlockByNumber') {
      return { timestamp: '0x65f2f900' };
    }
    throw new Error(`Unhandled call ${params.module}.${params.action}`);
  });

  const result = await getContractEtherscanEnrichment(scanner, address);
  assert.strictEqual(result.contractName, 'TokenA');
  assert.strictEqual(result.verified, true);
  assert.strictEqual(result.confidence, 'precise');
  assert.ok(result.deployedAtTimestamp > 0);
  assert.ok(result.deployedAt && result.deployedAt.endsWith('Z'));
}

async function testUnverifiedStillHasDeployment() {
  const address = '0x2222222222222222222222222222222222222222';
  const scanner = createMockScanner(async (params) => {
    if (params.module === 'contract' && params.action === 'getsourcecode') {
      return [{ ContractName: '', Proxy: '0', Implementation: '' }];
    }
    if (params.module === 'contract' && params.action === 'getcontractcreation') {
      return [{ txHash: '0xbbb', contractCreator: '0xDeployerB' }];
    }
    if (params.module === 'proxy' && params.action === 'eth_getTransactionByHash') {
      return { blockNumber: '0x11' };
    }
    if (params.module === 'proxy' && params.action === 'eth_getBlockByNumber') {
      return { timestamp: '0x65f2f901' };
    }
    throw new Error(`Unhandled call ${params.module}.${params.action}`);
  });

  const result = await getContractEtherscanEnrichment(scanner, address);
  assert.strictEqual(result.verified, false);
  assert.strictEqual(result.contractName, null);
  assert.strictEqual(result.confidence, 'precise');
  assert.ok(result.deployTxHash);
}

async function testProxyCanonicalName() {
  const proxyAddress = '0x3333333333333333333333333333333333333333';
  const implAddress = '0x4444444444444444444444444444444444444444';
  const scanner = createMockScanner(async (params) => {
    if (params.module === 'contract' && params.action === 'getsourcecode' && params.address.toLowerCase() === proxyAddress) {
      return [{ ContractName: 'TransparentUpgradeableProxy', Proxy: '1', Implementation: implAddress }];
    }
    if (params.module === 'contract' && params.action === 'getsourcecode' && params.address.toLowerCase() === implAddress) {
      return [{ ContractName: 'VaultImpl', Proxy: '0', Implementation: '' }];
    }
    if (params.module === 'contract' && params.action === 'getcontractcreation') {
      return [{ txHash: '0xccc', contractCreator: '0xDeployerC' }];
    }
    if (params.module === 'proxy' && params.action === 'eth_getTransactionByHash') {
      return { blockNumber: '0x12' };
    }
    if (params.module === 'proxy' && params.action === 'eth_getBlockByNumber') {
      return { timestamp: '0x65f2f902' };
    }
    throw new Error(`Unhandled call ${params.module}.${params.action}`);
  });

  const result = await getContractEtherscanEnrichment(scanner, proxyAddress);
  assert.strictEqual(result.isProxy, true);
  assert.strictEqual(result.proxyContractName, 'TransparentUpgradeableProxy');
  assert.strictEqual(result.implementationContractName, 'VaultImpl');
  assert.strictEqual(result.contractName, 'VaultImpl');
}

async function testRateLimitRetryBackoff() {
  const address = '0x5555555555555555555555555555555555555555';
  let sourceCodeAttempts = 0;

  const scanner = createMockScanner(async (params) => {
    if (params.module === 'contract' && params.action === 'getsourcecode') {
      sourceCodeAttempts += 1;
      if (sourceCodeAttempts < 3) {
        throw new Error('Max rate limit reached');
      }
      return [{ ContractName: 'RateLimitedContract', Proxy: '0', Implementation: '' }];
    }
    if (params.module === 'contract' && params.action === 'getcontractcreation') {
      return [{ txHash: '0xddd', contractCreator: '0xDeployerD' }];
    }
    if (params.module === 'proxy' && params.action === 'eth_getTransactionByHash') {
      return { blockNumber: '0x13' };
    }
    if (params.module === 'proxy' && params.action === 'eth_getBlockByNumber') {
      return { timestamp: '0x65f2f903' };
    }
    throw new Error(`Unhandled call ${params.module}.${params.action}`);
  });

  const result = await getContractEtherscanEnrichment(scanner, address);
  assert.strictEqual(result.verified, true);
  assert.ok(sourceCodeAttempts >= 3);
}

async function testBlockTimestampCaching() {
  const addressA = '0x6666666666666666666666666666666666666666';
  const addressB = '0x7777777777777777777777777777777777777777';
  let blockByNumberCalls = 0;

  const scanner = createMockScanner(async (params) => {
    if (params.module === 'contract' && params.action === 'getsourcecode') {
      return [{ ContractName: 'CacheTest', Proxy: '0', Implementation: '' }];
    }
    if (params.module === 'contract' && params.action === 'getcontractcreation') {
      const requestedAddress = (params.address || params.contractaddresses || '').toLowerCase();
      if (requestedAddress === addressA) {
        return [{ txHash: '0xaaa1', contractCreator: '0xCreator1' }];
      }
      if (requestedAddress === addressB) {
        return [{ txHash: '0xaaa2', contractCreator: '0xCreator2' }];
      }
      return [];
    }
    if (params.module === 'proxy' && params.action === 'eth_getTransactionByHash') {
      return { blockNumber: '0x20' };
    }
    if (params.module === 'proxy' && params.action === 'eth_getBlockByNumber') {
      blockByNumberCalls += 1;
      return { timestamp: '0x65f2f904' };
    }
    throw new Error(`Unhandled call ${params.module}.${params.action}`);
  });

  await getContractEtherscanEnrichment(scanner, addressA);
  await getContractEtherscanEnrichment(scanner, addressB);
  assert.strictEqual(blockByNumberCalls, 1, 'Expected block timestamp cache hit on second lookup');
}

async function run() {
  const tests = [
    ['verified non-proxy', testVerifiedNonProxy],
    ['unverified with deployment', testUnverifiedStillHasDeployment],
    ['proxy canonical name', testProxyCanonicalName],
    ['rate limit retry', testRateLimitRetryBackoff],
    ['block timestamp caching', testBlockTimestampCaching]
  ];

  for (const [name, fn] of tests) {
    await fn();
    console.log(`✅ ${name}`);
  }

  console.log('\nAll enrichment tests passed.');
}

run().catch((error) => {
  console.error('\n❌ Enrichment test failed:', error.message);
  process.exit(1);
});

