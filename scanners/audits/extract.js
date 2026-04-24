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

/**
 * BugChainIndexer stores multi-file (`solc-j` / `solc-m`) contracts as one
 * concatenated blob with `// File: <relative-path>` markers at every file
 * boundary. Recover the original file layout so Foundry can resolve imports.
 * Returns null when no markers are present (plain single-file source).
 */
function splitMultiFile(source) {
  const re = /^\/\/ File:\s*(.+?)\s*$/gm;
  const marks = [];
  let m;
  while ((m = re.exec(source)) !== null) {
    marks.push({ start: m.index, after: re.lastIndex, rel: m[1].trim() });
  }
  if (marks.length < 2) return null;
  const files = [];
  for (let i = 0; i < marks.length; i++) {
    const end = i + 1 < marks.length ? marks[i + 1].start : source.length;
    const body = source.slice(marks[i].after, end).replace(/^\s*\n/, '');
    files.push({ rel: marks[i].rel, body });
  }
  return files;
}

/**
 * Scan all `import "X"` / `import {…} from "X"` statements across the split
 * files and derive Foundry remappings for bare specifiers (`@foo/...`,
 * `foo/bar.sol`) by matching their tail against the paths we actually wrote.
 *
 * Etherscan's `@openzeppelin/contracts/...` imports resolve to files written
 * at `lib/openzeppelin-contracts/contracts/...` — the `@openzeppelin/` alias
 * has to be derived from the longest path suffix shared between the import
 * spec and a real file, not a literal substring match.
 */
function deriveRemappings(files) {
  const importRe = /import\s+(?:[^'"]*?from\s+)?['"]([^'"]+)['"]/g;
  const bareImports = new Set();
  for (const f of files) {
    let m;
    while ((m = importRe.exec(f.body)) !== null) {
      const spec = m[1];
      if (spec.startsWith('./') || spec.startsWith('../') || spec.startsWith('/')) continue;
      bareImports.add(spec);
    }
  }

  const remaps = new Map();
  for (const spec of bareImports) {
    const specParts = spec.split('/');
    let best = null; // { file, commonTail }
    for (const f of files) {
      const fileParts = f.rel.split('/');
      let n = 0;
      while (n < specParts.length && n < fileParts.length
             && specParts[specParts.length - 1 - n] === fileParts[fileParts.length - 1 - n]) n++;
      if (n === 0) continue;
      if (!best || n > best.commonTail) best = { file: f.rel, commonTail: n };
    }
    if (!best || best.commonTail === 0) continue;
    // Full spec match = the file already sits at the spec path; nothing to remap.
    if (best.commonTail === specParts.length
        && best.file.split('/').length === specParts.length) continue;

    const fileParts = best.file.split('/');
    const keyPrefix = specParts.slice(0, specParts.length - best.commonTail).join('/');
    const valPrefix = fileParts.slice(0, fileParts.length - best.commonTail).join('/');
    if (!keyPrefix || !valPrefix) continue;
    const key = keyPrefix + '/';
    const val = valPrefix + '/';
    // Prefer the deepest mapping we can derive from any one import — that
    // gives the most specific remap (Foundry picks longest prefix).
    const existing = remaps.get(key);
    if (!existing || val.length > existing.length) remaps.set(key, val);
  }
  return Array.from(remaps.entries()).map(([k, v]) => `${k}=${v}`);
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
  // Auto-detected later if the multi-file split writes files under a root
  // directory other than `src/` (e.g. `contracts/`). Gets persisted in
  // foundry.toml's `src` key so `forge build` finds the sources.
  let foundrySrcDir = 'src';

  const contractName = sanitizeContractName(row.contract_name);
  let srcFile = path.join(srcDir, `${contractName}.sol`);
  let remappings = [];
  let multiFileCount = 1;

  // `compiler_type = 'solc'` means Etherscan stored this as a true single-file
  // contract. Some such blobs happen to contain `// File:` comments for
  // readability (e.g. section headers), which our splitter would falsely
  // interpret as file boundaries — producing N files with broken cross-refs
  // because Solidity 0.4.x didn't need imports between in-scope contracts.
  // Only attempt the multi-file split for solc-j / solc-m types.
  const isMultiFileType = String(row.compiler_type || '').toLowerCase().includes('-');
  const split = isMultiFileType ? splitMultiFile(row.source_code) : null;
  if (split && split.length > 0) {
    // Multi-file project (solc-j / solc-m). Restore the original tree so
    // `import "./interfaces/X.sol"` and `import "@openzeppelin/..."` resolve.
    const topRoots = new Set();
    for (const f of split) {
      const target = path.join(projectDir, f.rel);
      if (!target.startsWith(projectDir + path.sep)) {
        // Defensive: a `// File:` marker with `..` in it would escape the project.
        console.error(`WARN: skipping out-of-tree file path ${f.rel}`);
        continue;
      }
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, f.body, 'utf8');
      const firstSeg = f.rel.split('/')[0];
      if (firstSeg) topRoots.add(firstSeg);
    }
    remappings = deriveRemappings(split);
    multiFileCount = split.length;
    // Pick the source-root Foundry should compile from. If the split placed
    // files under `src/` already, keep `src`; otherwise prefer `contracts/`
    // (Hardhat convention), or fall back to the first top-level dir.
    if (topRoots.has('src')) foundrySrcDir = 'src';
    else if (topRoots.has('contracts')) foundrySrcDir = 'contracts';
    else {
      // Pick the first non-library top-level directory.
      const libRoots = new Set(['lib', 'node_modules', '@openzeppelin', '@uniswap', '@chainlink', 'solmate', 'solady']);
      const candidate = [...topRoots].find((r) => !libRoots.has(r));
      if (candidate) foundrySrcDir = candidate;
    }
    // The "primary" source file is the first occurrence whose basename matches
    // the contract's own name — fall back to the first file if not found.
    const primary = split.find((f) => path.basename(f.rel, '.sol') === contractName)
      || split.find((f) => path.basename(f.rel, '.sol').toLowerCase() === contractName.toLowerCase())
      || split[0];
    srcFile = path.join(projectDir, primary.rel);
  } else {
    // Plain single-file source — write as-is under src/.
    fs.writeFileSync(srcFile, row.source_code, 'utf8');
  }

  // Etherscan's evm_version field uses "Default" to mean "whatever solc's default
  // is for this compiler" — Foundry doesn't accept that literally, so omit it.
  const evmVersion = row.evm_version && /^(homestead|tangerineWhistle|spuriousDragon|byzantium|constantinople|petersburg|istanbul|berlin|london|paris|shanghai|cancun|prague)$/i.test(row.evm_version)
    ? row.evm_version.toLowerCase()
    : null;
  const solcVersion = solcMajorMinor(row.compiler_version);
  const foundryToml = [
    '[profile.default]',
    `src = "${foundrySrcDir}"`,
    'out = "out"',
    'libs = ["lib"]',
    remappings.length ? 'remappings = [' + remappings.map((r) => `"${r}"`).join(', ') + ']' : null,
    solcVersion ? `solc = "${solcVersion}"` : null,
    evmVersion ? `evm_version = "${evmVersion}"` : null,
    'optimizer = ' + (row.optimization_used === '1' || row.optimization_used === 'true' ? 'true' : 'false'),
    row.runs ? `optimizer_runs = ${Number(row.runs) || 200}` : null,
    ''
  ].filter(Boolean).join('\n');
  fs.writeFileSync(path.join(projectDir, 'foundry.toml'), foundryToml, 'utf8');
  if (remappings.length) {
    fs.writeFileSync(path.join(projectDir, 'remappings.txt'), remappings.join('\n') + '\n', 'utf8');
  }

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
  console.error(`  source: ${srcFile} (${row.source_code.length} bytes, ${multiFileCount} file${multiFileCount > 1 ? 's' : ''})`);
  console.error(`  compiler: ${row.compiler_version || 'unknown'} (${row.compiler_type || 'unknown'})`);
  if (remappings.length) {
    console.error(`  remappings: ${remappings.length} derived`);
    for (const r of remappings) console.error(`    ${r}`);
  }
  process.stdout.write(projectDir + '\n');
}

main().catch((err) => {
  console.error(`ERROR: ${err.stack || err.message || err}`);
  process.exit(1);
});
