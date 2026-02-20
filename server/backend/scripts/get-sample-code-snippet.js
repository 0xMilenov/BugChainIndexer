#!/usr/bin/env node
/**
 * Output a sample code snippet from contract_sources for testing the code search UI.
 * Run from server/backend: node scripts/get-sample-code-snippet.js
 *
 * Usage:
 *   1. Run this script to get a snippet
 *   2. Paste the snippet into the Code Search input in the UI
 *   3. Click "Search by Code"
 *   4. Verify the same contract (address + network) appears in results
 */
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { pool } = require("../services/db");

function extractSnippet(sourceCode) {
  if (!sourceCode || typeof sourceCode !== "string") return null;
  const src = sourceCode.trim();
  // Prefer contract/class name (Solidity contract X, Vyper @title X, etc.)
  const titleMatch = src.match(/@title\s+(\w+)/);
  if (titleMatch) return titleMatch[0];
  const contractMatch = src.match(/contract\s+(\w+)\s*\{/);
  if (contractMatch) return contractMatch[0];
  // Try to find a function block
  const fnMatch = src.match(/function\s+\w+\s*\([^)]*\)[^{]*\{[\s\S]*?\n\s*\}/);
  if (fnMatch) return fnMatch[0].trim();
  // Fallback: first 100 chars
  const lines = src.split("\n").filter((l) => l.trim().length > 0);
  let out = "";
  for (const line of lines) {
    out += line + "\n";
    if (out.length >= 100) break;
  }
  return out.trim() || src.slice(0, 150);
}

async function main() {
  const { rows } = await pool.query(`
    SELECT address, network, source_code
    FROM contract_sources
    WHERE source_code IS NOT NULL AND LENGTH(source_code) > 50
    LIMIT 1
  `);

  if (rows.length === 0) {
    console.error("No contract sources found in database. Run the scanner first.");
    process.exit(1);
  }

  const { address, network, source_code } = rows[0];
  const snippet = extractSnippet(source_code);

  console.log("# Sample code snippet for testing Code Search");
  console.log("# Source: address=" + address + " network=" + network);
  console.log("#");
  console.log("# Copy everything below this line into the Code Search input:");
  console.log("---");
  console.log(snippet);
  console.log("---");
  console.log("# Expected: The contract at " + address + " on " + network + " should appear in results.");

  await pool.end();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
