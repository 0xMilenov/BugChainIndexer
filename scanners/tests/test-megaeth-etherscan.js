/**
 * Test: MegaETH Etherscan API
 *
 * Verifies that MegaETH network can retrieve contract source code and enrichment
 * using Etherscan v2 API (chainid: 4326).
 *
 * Known verified contract: 0x02Ae4716B9D5d48Db1445814b0eDE39f5c28264B
 * - ERC1967Proxy with BeefyRevenueBridge implementation
 * - https://mega.etherscan.io/address/0x02ae4716b9d5d48db1445814b0ede39f5c28264b#code
 *
 * Requires: DEFAULT_ETHERSCAN_KEYS or ETHERSCAN_API_KEY in env
 */

require('dotenv').config();
const { etherscanRequest, getContractEtherscanEnrichment } = require('../common/core');

const KNOWN_VERIFIED_CONTRACT = '0x02Ae4716B9D5d48Db1445814b0eDE39f5c28264B';

async function testGetSourceCode() {
  console.log('\n' + '-'.repeat(70));
  console.log('Test 1: getsourcecode API');
  console.log(`Address: ${KNOWN_VERIFIED_CONTRACT}`);
  console.log('-'.repeat(70));

  const result = await etherscanRequest('megaeth', {
    module: 'contract',
    action: 'getsourcecode',
    address: KNOWN_VERIFIED_CONTRACT
  });

  if (!result || !Array.isArray(result) || result.length === 0) {
    throw new Error('Invalid API response');
  }

  const sourceData = result[0];

  if (!sourceData.SourceCode || sourceData.SourceCode === '') {
    throw new Error('Source code not verified or empty');
  }

  if (!sourceData.ContractName || sourceData.ContractName.trim() === '') {
    throw new Error('ContractName missing');
  }

  console.log('✅ getsourcecode OK');
  console.log(`   ContractName: ${sourceData.ContractName}`);
  console.log(`   Proxy: ${sourceData.Proxy === '1' ? 'Yes' : 'No'}`);
  console.log(`   Implementation: ${sourceData.Implementation || 'N/A'}`);
  console.log(`   SourceCode length: ${sourceData.SourceCode.length}`);

  return sourceData;
}

async function testGetContractEtherscanEnrichment() {
  console.log('\n' + '-'.repeat(70));
  console.log('Test 2: getContractEtherscanEnrichment (full flow)');
  console.log(`Address: ${KNOWN_VERIFIED_CONTRACT}`);
  console.log('-'.repeat(70));

  const scanner = {
    network: 'megaeth',
    etherscanCall: (params) => etherscanRequest('megaeth', params),
    log: () => {}
  };

  const enrichment = await getContractEtherscanEnrichment(scanner, KNOWN_VERIFIED_CONTRACT);

  if (!enrichment.verified) {
    throw new Error(`Expected verified=true, got ${enrichment.verified}`);
  }

  if (!enrichment.contractName || enrichment.contractName.trim() === '') {
    throw new Error(`Expected contractName, got: ${JSON.stringify(enrichment.contractName)}`);
  }

  console.log('✅ getContractEtherscanEnrichment OK');
  console.log(`   contractName: ${enrichment.contractName}`);
  console.log(`   verified: ${enrichment.verified}`);
  console.log(`   isProxy: ${enrichment.isProxy}`);
  console.log(`   implementationAddress: ${enrichment.implementationAddress || 'N/A'}`);
  console.log(`   proxyContractName: ${enrichment.proxyContractName || 'N/A'}`);
  console.log(`   implementationContractName: ${enrichment.implementationContractName || 'N/A'}`);

  return enrichment;
}

async function run() {
  console.log('='.repeat(70));
  console.log('MegaETH Etherscan API Test');
  console.log('='.repeat(70));
  console.log('\nUsing: Etherscan v2 API (chainid: 4326)');
  console.log(`Test contract: ${KNOWN_VERIFIED_CONTRACT}`);
  console.log('(BeefyRevenueBridge proxy - verified on mega.etherscan.io)\n');

  try {
    await testGetSourceCode();
    await testGetContractEtherscanEnrichment();

    console.log('\n' + '='.repeat(70));
    console.log('All tests passed');
    console.log('='.repeat(70));
    return true;
  } catch (error) {
    console.error('\n❌ FAILED:', error.message);
    console.error('   Stack:', error.stack);
    console.log('\n' + '='.repeat(70));
    console.log('Ensure DEFAULT_ETHERSCAN_KEYS or ETHERSCAN_API_KEY is set');
    console.log('='.repeat(70));
    return false;
  }
}

run()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
