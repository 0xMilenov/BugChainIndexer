#!/usr/bin/env node
/**
 * Prepare a fuzz-campaign project from a contract in contract_sources.
 *
 * Unlike `extract.js` (which materializes sources for the Plamen auditor),
 * this script produces a Foundry project that Recon Magic Framework can
 * consume: a git-init'd working tree with a clean initial commit, so the
 * framework's per-step `shouldCommitChanges: true` can track progress
 * without colliding with any other project history.
 *
 * Usage:
 *   node scanners/audits/prepare-fuzz.js \
 *     --network binance --address 0x238a358808379702088667322f80ac48bad5e6c4
 *
 *   # Or reuse an already-extracted audit project as the source, skipping the
 *   # DB roundtrip:
 *   node scanners/audits/prepare-fuzz.js \
 *     --from /tmp/audits/binance-0x238a...
 *
 * Prints the absolute project path on stdout (for shell chaining).
 * Defaults to FUZZ_ROOT=/home/claude/audits/fuzz.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const FUZZ_ROOT = process.env.FUZZ_ROOT || '/home/claude/audits/fuzz';

function parseArgs(argv) {
  const args = { network: null, address: null, from: null, out: null, force: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i], next = argv[i + 1];
    if (a === '--network') { args.network = next; i++; }
    else if (a === '--address') { args.address = next; i++; }
    else if (a === '--from') { args.from = next; i++; }
    else if (a === '--out') { args.out = next; i++; }
    else if (a === '--force') { args.force = true; }
    else if (a === '--help' || a === '-h') {
      console.error('Usage: prepare-fuzz.js (--network N --address 0x...) | --from DIR  [--out DIR] [--force]');
      process.exit(0);
    }
  }
  if (!args.from && (!args.network || !args.address)) {
    console.error('ERROR: pass either --from SOURCE_DIR or both --network and --address');
    process.exit(2);
  }
  if (args.address) args.address = args.address.toLowerCase();
  return args;
}

function copyDirRecursive(src, dst) {
  // Node 16.7+ has fs.cpSync, which handles symlinks and dirs natively.
  fs.cpSync(src, dst, {
    recursive: true,
    force: true,
    // Skip tool caches and noisy state so we ship a clean project.
    filter: (s) => {
      const base = path.basename(s);
      return !['node_modules', 'out', 'cache', 'broadcast', '.git',
              '.plamen', '.audit_scratchpad', '.medusa-corpus',
              'crytic-export'].includes(base);
    }
  });
}

function runGit(dir, args) {
  return execFileSync('git', args, { cwd: dir, env: process.env, stdio: ['ignore', 'pipe', 'pipe'] })
    .toString().trim();
}

function ensureExtractedAudit(args) {
  // If --from was provided, use it. Otherwise extract via extract.js.
  if (args.from) {
    const p = path.resolve(args.from);
    if (!fs.existsSync(path.join(p, 'foundry.toml'))) {
      throw new Error(`${p} is not a Foundry project (no foundry.toml)`);
    }
    return p;
  }
  // Derive default location from extract.js convention: /tmp/audits/<net>-<addr>
  const defaultAudit = path.join('/tmp/audits', `${args.network}-${args.address}`);
  if (fs.existsSync(path.join(defaultAudit, 'foundry.toml'))) {
    console.error(`reusing existing audit project at ${defaultAudit}`);
    return defaultAudit;
  }
  // Fall back to running extract.js inline.
  console.error(`no audit project at ${defaultAudit} — running extract.js inline`);
  const extract = path.resolve(__dirname, 'extract.js');
  execFileSync('node', [extract, '--network', args.network, '--address', args.address],
    { stdio: 'inherit' });
  return defaultAudit;
}

function main() {
  const args = parseArgs(process.argv);
  const sourceDir = ensureExtractedAudit(args);

  // Target dir name: prefer explicit --out, else derive from the audit metadata.
  let targetDir;
  if (args.out) {
    targetDir = path.resolve(args.out);
  } else {
    const metaPath = path.join(sourceDir, 'audit-metadata.json');
    const meta = fs.existsSync(metaPath)
      ? JSON.parse(fs.readFileSync(metaPath, 'utf8'))
      : {};
    const net = args.network || meta.network || 'unknown';
    const addr = args.address || meta.address || path.basename(sourceDir);
    const name = (meta.contract_name || 'contract').replace(/[^A-Za-z0-9_-]/g, '');
    targetDir = path.join(FUZZ_ROOT, `${net}-${addr}-${name}`);
  }

  if (fs.existsSync(targetDir)) {
    if (!args.force) {
      console.error(`ERROR: ${targetDir} exists (re-run with --force to overwrite)`);
      process.exit(3);
    }
    fs.rmSync(targetDir, { recursive: true, force: true });
  }

  console.error(`copying ${sourceDir} -> ${targetDir}`);
  fs.mkdirSync(path.dirname(targetDir), { recursive: true });
  copyDirRecursive(sourceDir, targetDir);

  // Drop in a .gitignore that keeps the fuzz workspace clean across Recon steps.
  const gitignore = [
    'out/', 'cache/', 'broadcast/',
    'crytic-export/', '.medusa-corpus/',
    'magic/logs/', 'magic/*.log', 'magic/echidna-output.log',
    '.env', '*.tmp'
  ].join('\n') + '\n';
  fs.writeFileSync(path.join(targetDir, '.gitignore'), gitignore);

  console.error(`initializing git repo at ${targetDir}`);
  runGit(targetDir, ['init', '--initial-branch=main']);
  // A local identity is required by `git commit` even for one-shot repos. Pick
  // something obvious so the initial commit is traceable back to this script.
  runGit(targetDir, ['config', 'user.email', 'fuzz-bot@bugchainindexer.local']);
  runGit(targetDir, ['config', 'user.name', 'BugChainIndexer Fuzz Bot']);
  runGit(targetDir, ['add', '-A']);
  runGit(targetDir, ['commit', '-m', 'chore: initial fuzz-project snapshot from audit extract']);

  const head = runGit(targetDir, ['rev-parse', '--short', 'HEAD']);
  console.error(`ready for Recon Magic at HEAD=${head}`);
  console.error(`  cd ${targetDir}`);
  console.error(`  export PATH="$HOME/.local/bin:$HOME/.foundry/bin:$PATH"`);
  console.error('  recon-magic-framework --workflow <workflow-name> --dangerous');
  process.stdout.write(targetDir + '\n');
}

try {
  main();
} catch (err) {
  console.error(`ERROR: ${err.stack || err.message || err}`);
  process.exit(1);
}
