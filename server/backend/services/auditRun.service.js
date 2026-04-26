/**
 * Audit Run Service
 *
 * Triggers a Plamen audit for an indexed contract via the existing
 * scanners/audits/audit-one.sh wrapper, persists run metadata in
 * `contract_audits`, and exposes status + recent log lines for polling.
 *
 * The wrapper itself is fire-and-forget: it extracts the contract, runs
 * `plamen <mode> .`, then ingests the resulting AUDIT_REPORT.md back into
 * the DB. We mark the row 'running' before spawning and let ingest.js flip
 * it to 'completed'. If the wrapper exits non-zero we flip to 'failed'.
 */
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { pool } = require('./db');
const { NETWORKS } = require('../../../scanners/config/networks');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const AUDIT_ONE_SH = path.join(REPO_ROOT, 'scanners', 'audits', 'audit-one.sh');
const AUDIT_ROOT = process.env.AUDIT_ROOT || '/tmp/audits';
const VALID_MODES = new Set(['light', 'core', 'thorough']);
const EVM_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

/** Phase markers we look for in the log tail when reporting progress. */
const PHASE_PATTERNS = [
  // Highest priority first — later phases override earlier ones once seen.
  /\bPhase\s+6\b/i,
  /\bPhase\s+5\b/i,
  /\bPhase\s+4[a-z]?\b/i,
  /\bPhase\s+3[a-z]?\b/i,
  /\bPhase\s+2\b/i,
  /\bPhase\s+1\b/i,
  /\bPhase\s+0\b/i,
];

function normalizeAddress(addr) {
  return (addr || '').toString().trim().toLowerCase();
}

function normalizeNetwork(net) {
  return (net || '').toString().trim().toLowerCase();
}

function isValidAddress(addr) {
  return EVM_ADDRESS_REGEX.test(addr || '');
}

/**
 * Read the last `maxBytes` of a file, decoding as UTF-8. Returns '' if the
 * file doesn't exist or is unreadable. Trims to whole lines.
 */
function tailFile(filePath, maxBytes = 8192) {
  try {
    const stat = fs.statSync(filePath);
    const start = Math.max(0, stat.size - maxBytes);
    const fd = fs.openSync(filePath, 'r');
    try {
      const len = stat.size - start;
      const buf = Buffer.alloc(len);
      fs.readSync(fd, buf, 0, len, start);
      let s = buf.toString('utf8');
      if (start > 0) {
        // Drop the partial first line so we always emit whole lines.
        const nl = s.indexOf('\n');
        if (nl >= 0) s = s.slice(nl + 1);
      }
      return s;
    } finally {
      fs.closeSync(fd);
    }
  } catch {
    return '';
  }
}

/**
 * Scan a log tail for the highest-numbered phase marker we recognize. This
 * is best-effort: Plamen logs aren't structured, so we just look for "Phase N"
 * substrings. Returns null if nothing matches.
 */
function detectPhase(logTail) {
  if (!logTail) return null;
  // Iterate in priority order (latest phases first) and return the first match.
  for (const re of PHASE_PATTERNS) {
    const m = logTail.match(re);
    if (m) return m[0];
  }
  return null;
}

/**
 * Heuristic: is `pid` still alive? `kill -0` throws ESRCH if not.
 * Returns false on any failure (including permission errors — backend runs as
 * the same user that spawned the audit, so EPERM here indicates the PID was
 * recycled by an unrelated process).
 */
function isProcessAlive(pid) {
  if (!pid || !Number.isFinite(pid)) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function getAuditRow(address, network) {
  const r = await pool.query(
    `SELECT id, address, network, audit_tool, audit_mode, tool_version,
            status, started_at, completed_at, duration_ms,
            critical_count, high_count, medium_count, error_message,
            pid, phase, log_path
       FROM contract_audits
      WHERE LOWER(address) = LOWER($1)
        AND LOWER(network) = LOWER($2)
        AND audit_tool = 'plamen'
      LIMIT 1`,
    [address, network]
  );
  return r.rows[0] || null;
}

/**
 * Insert or update the contract_audits row for this run, marking it 'running'.
 * Re-uses the existing row (unique on address+network+audit_tool) so the
 * dashboard's findings join still resolves.
 */
async function upsertRunningRow({ address, network, mode, logPath }) {
  const now = Date.now();
  const r = await pool.query(
    `INSERT INTO contract_audits
       (address, network, audit_tool, audit_mode, status, started_at,
        critical_count, high_count, medium_count, log_path, phase)
     VALUES ($1, $2, 'plamen', $3, 'running', $4, 0, 0, 0, $5, NULL)
     ON CONFLICT (address, network, audit_tool) DO UPDATE
       SET status        = 'running',
           audit_mode    = EXCLUDED.audit_mode,
           started_at    = EXCLUDED.started_at,
           completed_at  = NULL,
           duration_ms   = NULL,
           error_message = NULL,
           log_path      = EXCLUDED.log_path,
           phase         = NULL
     RETURNING id`,
    [address, network, mode, now, logPath]
  );
  return r.rows[0].id;
}

async function setPid(auditId, pid) {
  await pool.query(`UPDATE contract_audits SET pid = $1 WHERE id = $2`, [pid, auditId]);
}

async function setPhase(auditId, phase) {
  await pool.query(`UPDATE contract_audits SET phase = $1 WHERE id = $2`, [phase, auditId]);
}

async function markFailed(auditId, errorMessage) {
  const now = Date.now();
  await pool.query(
    `UPDATE contract_audits
        SET status = 'failed',
            completed_at = $1,
            duration_ms = COALESCE($1 - started_at, 0),
            error_message = $2,
            pid = NULL
      WHERE id = $3 AND status = 'running'`,
    [now, errorMessage || 'audit-one.sh exited non-zero', auditId]
  );
}

/**
 * Verify that an indexed, verified row exists for this contract. We refuse
 * to spawn audit-one.sh for unknown / unverified addresses — the wrapper's
 * extract step would just fail later anyway.
 */
async function ensureContractIndexed(address, network) {
  const r = await pool.query(
    `SELECT a.address, a.verified
       FROM addresses a
      WHERE LOWER(a.address) = LOWER($1)
        AND LOWER(a.network) = LOWER($2)
      LIMIT 1`,
    [address, network]
  );
  if (r.rows.length === 0) return { ok: false, error: 'Contract is not indexed yet' };
  if (!r.rows[0].verified) return { ok: false, error: 'Contract is not verified' };
  return { ok: true };
}

/**
 * Trigger a Plamen audit run for the given contract.
 *
 * Returns `{ ok, audit, error }`. `audit` mirrors the row shape exposed by
 * `getAuditStatus` so the frontend can immediately reflect 'running' state.
 */
async function triggerAudit({ address, network, mode = 'thorough' }) {
  const addr = normalizeAddress(address);
  const net = normalizeNetwork(network);
  const m = (mode || 'thorough').toLowerCase();

  if (!isValidAddress(addr)) return { ok: false, error: 'Invalid contract address' };
  if (!NETWORKS[net]) return { ok: false, error: 'Unsupported network' };
  if (!VALID_MODES.has(m)) return { ok: false, error: 'Invalid mode (must be light|core|thorough)' };

  const indexedCheck = await ensureContractIndexed(addr, net);
  if (!indexedCheck.ok) return indexedCheck;

  // Reject if a run is already in flight for this contract.
  const existing = await getAuditRow(addr, net);
  if (existing && (existing.status === 'running' || existing.status === 'pending')) {
    if (isProcessAlive(existing.pid)) {
      return { ok: false, error: 'Audit already running for this contract', audit: existing };
    }
    // Stale: process died without flipping status. Fall through and re-spawn.
  }

  if (!fs.existsSync(AUDIT_ONE_SH)) {
    return { ok: false, error: `audit-one.sh not found at ${AUDIT_ONE_SH}` };
  }

  const logDir = path.join(AUDIT_ROOT, 'logs');
  try {
    fs.mkdirSync(logDir, { recursive: true });
  } catch (err) {
    return { ok: false, error: `Cannot create log dir: ${err.message}` };
  }
  const logPath = path.join(logDir, `${net}-${addr}.log`);

  const auditId = await upsertRunningRow({ address: addr, network: net, mode: m, logPath });

  // Spawn detached so the audit survives a backend restart. Stdout / stderr
  // already redirect to LOG_FILE inside audit-one.sh, but we also capture the
  // wrapper's own startup output for diagnostics.
  let child;
  try {
    const wrapperLog = fs.openSync(logPath + '.wrapper', 'a');
    child = spawn('bash', [AUDIT_ONE_SH, net, addr], {
      detached: true,
      stdio: ['ignore', wrapperLog, wrapperLog],
      env: {
        ...process.env,
        MODE: m,
        AUDIT_ROOT,
      },
      cwd: REPO_ROOT,
    });
  } catch (err) {
    await markFailed(auditId, `spawn failed: ${err.message}`);
    return { ok: false, error: `Failed to spawn audit: ${err.message}` };
  }

  const pid = child.pid;
  if (!pid) {
    await markFailed(auditId, 'spawn returned no pid');
    return { ok: false, error: 'Failed to spawn audit (no pid)' };
  }

  await setPid(auditId, pid);

  // Watch the wrapper exit. ingest.js flips status to 'completed' on success;
  // if the script exits non-zero before that, flag it as failed so the UI
  // doesn't poll forever.
  child.on('exit', (code) => {
    pool.query(
      `SELECT status FROM contract_audits WHERE id = $1`,
      [auditId]
    ).then(async (r) => {
      const status = r.rows[0]?.status;
      if (status === 'completed') return; // ingest.js already finalized
      if (code === 0) {
        // Wrapper succeeded but ingest didn't update? Mark completed anyway.
        await pool.query(
          `UPDATE contract_audits
              SET status = 'completed',
                  completed_at = $1,
                  duration_ms = COALESCE($1 - started_at, 0),
                  pid = NULL
            WHERE id = $2 AND status = 'running'`,
          [Date.now(), auditId]
        );
      } else {
        await markFailed(auditId, `audit-one.sh exited with code ${code}`);
      }
    }).catch((err) => {
      console.error('[auditRun] post-exit update failed:', err.message);
    });
  });

  // Don't keep the parent attached — we want the child to outlive this request.
  child.unref();

  // Best-effort initial phase tag.
  await setPhase(auditId, 'Phase 0 · Setup');

  const fresh = await getAuditRow(addr, net);
  return { ok: true, audit: fresh };
}

/**
 * Read the current audit row + parse a phase from the log tail, returning
 * a status payload safe to expose to the dashboard.
 */
async function getAuditStatus({ address, network }) {
  const addr = normalizeAddress(address);
  const net = normalizeNetwork(network);
  if (!isValidAddress(addr) || !net) {
    return { ok: false, error: 'address and network are required' };
  }
  const row = await getAuditRow(addr, net);
  if (!row) return { ok: true, audit: null };

  let logTail = '';
  let detectedPhase = null;
  if (row.log_path) {
    logTail = tailFile(row.log_path, 4096);
    detectedPhase = detectPhase(logTail);
  }

  // If the row says 'running' but the PID is dead AND ingest never finalized,
  // surface it as 'failed' to break polling. Don't auto-update the row from
  // this read path — let the spawn 'exit' handler do that.
  let liveStatus = row.status;
  if (row.status === 'running' && row.pid && !isProcessAlive(row.pid)) {
    liveStatus = 'stalled';
  }

  // Persist the phase whenever we've made progress (so the next caller doesn't
  // need the log file to render something useful).
  if (detectedPhase && detectedPhase !== row.phase && row.status === 'running') {
    setPhase(row.id, detectedPhase).catch(() => {});
  }

  return {
    ok: true,
    audit: {
      id: row.id,
      address: row.address,
      network: row.network,
      audit_tool: row.audit_tool,
      audit_mode: row.audit_mode,
      tool_version: row.tool_version,
      status: liveStatus,
      started_at: row.started_at,
      completed_at: row.completed_at,
      duration_ms: row.duration_ms,
      critical_count: row.critical_count,
      high_count: row.high_count,
      medium_count: row.medium_count,
      error_message: row.error_message,
      phase: detectedPhase || row.phase || null,
      log_tail: logTail
        ? logTail.split('\n').filter(Boolean).slice(-20).join('\n')
        : null,
    },
  };
}

module.exports = {
  triggerAudit,
  getAuditStatus,
};
