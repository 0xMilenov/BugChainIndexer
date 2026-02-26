#!/usr/bin/env node
/**
 * Test script for the Get Recon scaffold flow.
 * Run with: GITHUB_TOKEN=<your_token> node scripts/test-scaffold.js
 *
 * Requires GITHUB_TOKEN env var with repo scope.
 */
const githubService = require('../services/github.service');

const TEMPLATE_REPO = 'create-chimera-app';
const SAMPLE_SOURCE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract TestContract {
    function hello() public pure returns (string memory) {
        return "Hello from BugChainIndexer test";
    }
}
`;

async function main() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.error('Set GITHUB_TOKEN env var (with repo scope) to run this test.');
    process.exit(1);
  }

  const repoName = `test-recon-${Date.now()}`;
  const filePath = 'src/TestContract.sol';

  console.log('Testing scaffold flow...');
  console.log('1. Creating repo from template', TEMPLATE_REPO, '->', repoName);

  const { owner, repo, url } = await githubService.createRepoFromTemplate(
    token,
    repoName,
    'Test from BugChainIndexer scaffold script'
  );

  console.log('   Created:', url);

  console.log('2. Adding contract file', filePath);
  await githubService.addContractFile(
    token,
    owner,
    repo,
    filePath,
    SAMPLE_SOURCE,
    'Add TestContract.sol from test script'
  );

  console.log('   Done.');
  console.log('');
  console.log('SUCCESS: Scaffold flow works. Repo:', url);
}

main().catch((err) => {
  console.error('FAILED:', err?.response?.data?.message || err?.message || err);
  process.exit(1);
});
