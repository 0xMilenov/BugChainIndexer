#!/usr/bin/env node

/**
 * Test: Source code extraction from Etherscan getSourceCode response
 *
 * Covers:
 * - extractSourceCodeText with multi-file format ({{ "sources": { "path.sol": { "content": "..." } } }})
 * - extractSourceCodeText with single-file plain text
 * - extractSourceCodeText with legacy multi-file format ({ "sources": { "path.sol": "content" } })
 * - getContractEtherscanEnrichment for LPGPVault (0x2Ce47888334F76ca2fFDBa4896C509A695197b17) when API key available
 */

require('dotenv').config();
const assert = require('assert');
const { extractSourceCodeText, getContractEtherscanEnrichment, etherscanRequest } = require('../common/core');

const LPGP_VAULT_ADDRESS = '0x2Ce47888334F76ca2fFDBa4896C509A695197b17';

function createMockScanner(handler) {
  return {
    etherscanCall: async (params) => handler(params),
    log: () => {}
  };
}

async function testMultiFileStandardJson() {
  const sourceData = {
    SourceCode: `{{ "language": "Solidity", "sources": { "src/LPGPVault.sol": { "content": "pragma solidity ^0.8.0;\\ncontract LPGPVault { function deposit() external {} }" } } }}`,
    ContractName: 'LPGPVault'
  };
  const extracted = extractSourceCodeText(sourceData);
  assert.ok(extracted && extracted.length > 0, 'extractSourceCodeText should return non-empty string for multi-file format');
  assert.ok(extracted.includes('pragma solidity'), 'Extracted text should contain Solidity code');
  assert.ok(extracted.includes('deposit'), 'Extracted text should contain function body');
  assert.ok(extracted.includes('src/LPGPVault.sol') || extracted.includes('File:'), 'Extracted text should include file path for search');
}

async function testSingleFilePlainText() {
  const sourceData = {
    SourceCode: 'pragma solidity ^0.8.0;\ncontract Simple { }',
    ContractName: 'Simple'
  };
  const extracted = extractSourceCodeText(sourceData);
  assert.strictEqual(extracted, 'pragma solidity ^0.8.0;\ncontract Simple { }');
}

async function testLegacyMultiFile() {
  const sourceData = {
    SourceCode: '{ "sources": { "A.sol": "pragma solidity ^0.8.0;", "B.sol": "contract B {}" } }',
    ContractName: 'Multi'
  };
  const extracted = extractSourceCodeText(sourceData);
  assert.ok(extracted && extracted.length > 0);
  assert.ok(extracted.includes('pragma solidity'));
  assert.ok(extracted.includes('contract B'));
}

async function testEmptyOrMissingSourceCode() {
  assert.strictEqual(extractSourceCodeText({ SourceCode: '' }), null);
  assert.strictEqual(extractSourceCodeText({ SourceCode: null }), null);
  assert.strictEqual(extractSourceCodeText({}), null);
}

async function testMockEnrichmentLPGPVault() {
  const scanner = createMockScanner(async (params) => {
    if (params.module === 'contract' && params.action === 'getsourcecode') {
      return [{
        ContractName: 'LPGPVault',
        Proxy: '0',
        Implementation: '',
        SourceCode: `{{ "language": "Solidity", "sources": { "src/LPGPVault.sol": { "content": "pragma solidity ^0.8.0;\\ncontract LPGPVault { function deposit() external {} }" } } }}`
      }];
    }
    if (params.module === 'contract' && params.action === 'getcontractcreation') {
      return [{ txHash: '0xabc', contractCreator: '0xDeployer' }];
    }
    if (params.module === 'proxy' && params.action === 'eth_getTransactionByHash') {
      return { blockNumber: '0x10' };
    }
    if (params.module === 'proxy' && params.action === 'eth_getBlockByNumber') {
      return { timestamp: '0x65f2f900' };
    }
    throw new Error(`Unhandled: ${params.module}.${params.action}`);
  });

  const result = await getContractEtherscanEnrichment(scanner, LPGP_VAULT_ADDRESS);
  assert.strictEqual(result.contractName, 'LPGPVault');
  assert.ok(result.sourceCode && result.sourceCode.length > 0, 'Enrichment should return non-empty sourceCode for multi-file');
  assert.ok(result.sourceCode.includes('deposit'));
}

async function testRealEtherscanLPGPVault() {
  const hasKeys = process.env.DEFAULT_ETHERSCAN_KEYS || process.env.ETHERSCAN_API_KEY;
  if (!hasKeys) {
    console.log('   (Skipped: DEFAULT_ETHERSCAN_KEYS or ETHERSCAN_API_KEY not set)');
    return;
  }

  const result = await etherscanRequest('ethereum', {
    module: 'contract',
    action: 'getsourcecode',
    address: LPGP_VAULT_ADDRESS
  });

  if (!result || !Array.isArray(result) || result.length === 0) {
    console.log('   (Skipped: API returned no data)');
    return;
  }

  const sourceData = result[0];
  assert.strictEqual(sourceData.ContractName, 'LPGPVault', 'ContractName should be LPGPVault');

  const extracted = extractSourceCodeText(sourceData);
  assert.ok(extracted && extracted.length > 0, 'extractSourceCodeText should return non-empty string for real Etherscan response');
}

async function run() {
  const tests = [
    ['multi-file standard-json', testMultiFileStandardJson],
    ['single-file plain text', testSingleFilePlainText],
    ['legacy multi-file', testLegacyMultiFile],
    ['empty/missing SourceCode', testEmptyOrMissingSourceCode],
    ['mock enrichment LPGPVault', testMockEnrichmentLPGPVault],
    ['real Etherscan LPGPVault', testRealEtherscanLPGPVault]
  ];

  for (const [name, fn] of tests) {
    await fn();
    console.log(`✅ ${name}`);
  }

  console.log('\nAll source code extraction tests passed.');
}

run().catch((error) => {
  console.error('\n❌ Test failed:', error.message);
  process.exit(1);
});
