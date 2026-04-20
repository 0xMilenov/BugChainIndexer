#!/usr/bin/env node
/**
 * Materialize a verified contract from contract_sources to a temp Foundry-style
 * project so the Plamen auditor can consume it.
 *
 * Usage:
 *   node scanners/audits/extract.js --network ethereum --address 0xabc...
 *   node scanners/audits/extract.js --network ethereum --address 0xabc --out /custom/path
 *
 * Prints the absolute project path (one line, trailing newline) on success so
 * shell callers can `cd "$(node extract.js ...)"`. All logs go to stderr.
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const AUDIT_ROOT = process.env.AUDIT_ROOT || path.join('/tmp', 'audits');

function parseArgs(argv) {
  const args = { network: null, address: null, out: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const next = argv[i + 1];
    if (a === '--network') { args.network = next; i++; }
    else if (a === '--address') { args.address = next; i++; }
    else if (a === '--out') { args.out = next; i++; }
    else if (a === '--help' || a === '-h') {
      console.error('Usage: extract.js --network NAME --address 0x... [--out DIR]');
      process.exit(0);
    }
  }
  if (!args.network || !args.address) {
    console.error('ERROR: --network and --address are required');
    process.exit(2);
  }
  args.address = args.address.toLowerCase();
  return args;
}

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const candidates = [
    path.resolve(__dirname, '..', '..', 'server', 'backend', '.env'),
    // Fallback for git-worktree checkouts where .env lives in the main checkout.
    '/home/claude/BugChainIndexer/server/backend/.env'
  ];
  for (const envPath of candidates) {
    if (!fs.existsSync(envPath)) continue;
    const text = fs.readFileSync(envPath, 'utf8');
    const m = text.match(/^DATABASE_URL=(.+)$/m);
    if (m) return m[1].trim();
  }
  throw new Error(`DATABASE_URL unset; none of these .env files found: ${candidates.join(', ')}`);
}

function solcMajorMinor(version) {
  if (!version) return null;
  const m = String(version).match(/(\d+)\.(\d+)\.(\d+)/);
  return m ? `${m[1]}.${m[2]}.${m[3]}` : null;
}

function sanitizeContractName(name) {
  if (!name) return 'Contract';
  const cleaned = String(name).replace(/[^A-Za-z0-9_]/g, '');
  return /^[A-Za-z_]/.test(cleaned) ? cleaned : `C_${cleaned || 'Contract'}`;
}

async function main() {
  const args = parseArgs(process.argv);
  const pool = new Pool({ connectionString: loadDatabaseUrl() });

  const { rows } = await pool.query(
    `SELECT cs.source_code, cs.compiler_version, cs.compiler_type, cs.optimization_used,
            cs.runs, cs.license_type, cs.evm_version, cs.constructor_arguments,
            a.contract_name, a.is_proxy, a.implementation_address
       FROM contract_sources cs
       JOIN addresses a USING (address, network)
      WHERE cs.address = $1 AND cs.network = $2`,
    [args.address, args.network]
  );
  await pool.end();

  if (rows.length === 0) {
    console.error(`ERROR: no contract_sources row for ${args.network}/${args.address}`);
    process.exit(3);
  }

  const row = rows[0];
  if (!row.source_code || row.source_code.length < 40) {
    console.error(`ERROR: source_code is empty/too short for ${args.network}/${args.address}`);
    process.exit(4);
  }

  if (row.compiler_type && String(row.compiler_type).startsWith('vyper')) {
    console.error(`ERROR: Vyper contracts are not supported by the Plamen EVM flow (compiler_type=${row.compiler_type})`);
    process.exit(5);
  }

  const projectDir = args.out || path.join(AUDIT_ROOT, `${args.network}-${args.address}`);
  const srcDir = path.join(projectDir, 'src');
  fs.mkdirSync(srcDir, { recursive: true });

  const contractName = sanitizeContractName(row.contract_name);
  const srcFile = path.join(srcDir, `${contractName}.sol`);
  fs.writeFileSync(srcFile, row.source_code, 'utf8');

  // Etherscan's evm_version field uses "Default" to mean "whatever solc's default
  // is for this compiler" — Foundry doesn't accept that literally, so omit it.
  const evmVersion = row.evm_version && /^(homestead|tangerineWhistle|spuriousDragon|byzantium|constantinople|petersburg|istanbul|berlin|london|paris|shanghai|cancun|prague)$/i.test(row.evm_version)
    ? row.evm_version.toLowerCase()
    : null;
  const solcVersion = solcMajorMinor(row.compiler_version);
  const foundryToml = [
    '[profile.default]',
    'src = "src"',
    'out = "out"',
    'libs = ["lib"]',
    solcVersion ? `solc = "${solcVersion}"` : null,
    evmVersion ? `evm_version = "${evmVersion}"` : null,
    'optimizer = ' + (row.optimization_used === '1' || row.optimization_used === 'true' ? 'true' : 'false'),
    row.runs ? `optimizer_runs = ${Number(row.runs) || 200}` : null,
    ''
  ].filter(Boolean).join('\n');
  fs.writeFileSync(path.join(projectDir, 'foundry.toml'), foundryToml, 'utf8');

  const meta = {
    address: args.address,
    network: args.network,
    contract_name: row.contract_name,
    is_proxy: row.is_proxy,
    implementation_address: row.implementation_address,
    compiler_version: row.compiler_version,
    compiler_type: row.compiler_type,
    optimization_used: row.optimization_used,
    runs: row.runs,
    evm_version: row.evm_version,
    license_type: row.license_type,
    extracted_at: new Date().toISOString(),
    source_file: path.relative(projectDir, srcFile)
  };
  fs.writeFileSync(
    path.join(projectDir, 'audit-metadata.json'),
    JSON.stringify(meta, null, 2),
    'utf8'
  );

  const readme = [
    `# Audit target: ${row.contract_name || contractName}`,
    '',
    `- Network: \`${args.network}\``,
    `- Address: \`${args.address}\``,
    `- Compiler: \`${row.compiler_version || 'unknown'}\` (${row.compiler_type || 'unknown'})`,
    row.is_proxy ? `- Proxy for: \`${row.implementation_address || 'unknown'}\`` : null,
    '',
    'Source is flattened into `src/${NAME}.sol` by BugChainIndexer. Generated by `scanners/audits/extract.js`.',
    ''
  ].filter(l => l !== null).join('\n');
  fs.writeFileSync(path.join(projectDir, 'README.md'), readme, 'utf8');

  console.error(`extracted ${args.network}/${args.address} -> ${projectDir}`);
  console.error(`  source: ${srcFile} (${row.source_code.length} bytes)`);
  console.error(`  compiler: ${row.compiler_version || 'unknown'} (${row.compiler_type || 'unknown'})`);
  process.stdout.write(projectDir + '\n');
}

main().catch((err) => {
  console.error(`ERROR: ${err.stack || err.message || err}`);
  process.exit(1);
});
