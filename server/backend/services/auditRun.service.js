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
const INGEST_JS = path.join(REPO_ROOT, 'scanners', 'audits', 'ingest.js');
const AUDIT_ROOT = process.env.AUDIT_ROOT || '/tmp/audits';
const VALID_MODES = new Set(['light', 'core', 'thorough']);
const EVM_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

// Reconciler tuning. A wrapper death without an exit-handler firing (e.g.
// systemd cgroup kill on backend restart, OOM, host reboot) leaves the row
// stuck in 'running' forever. The reconciler scans periodically and either
// ingests the finished AUDIT_REPORT.md or marks the run failed.
const RECONCILER_INTERVAL_MS = Number(process.env.AUDIT_RECONCILER_INTERVAL_MS || 60_000);
// Don't reconcile runs younger than this — a row whose PID lookup briefly
// races the spawn handler should not be flipped to failed by mistake.
const RECONCILER_MIN_AGE_MS = Number(process.env.AUDIT_RECONCILER_MIN_AGE_MS || 60_000);

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

function fileMtimeMs(filePath) {
  try {
    return fs.statSync(filePath).mtimeMs;
  } catch {
    return null;
  }
}

function isLogCurrentForRun(filePath, startedAt) {
  const started = Number(startedAt || 0);
  if (!started) return true;

  const mtime = fileMtimeMs(filePath);
  if (!mtime) return false;

  // Allow a small skew because DB timestamps are generated in JS while file
  // mtimes come from the filesystem. Anything older is stale from a prior run.
  return mtime >= started - 1000;
}

function detectTerminalAuditFailure(logTail) {
  if (!logTail) return null;

  const criticalPhase = logTail.match(/Pipeline HALTED -- critical phase\s+'?([^'\n]+)'?\s+failed/i);
  if (criticalPhase?.[1]) {
    return `Plamen critical phase failed: ${criticalPhase[1].trim()}`;
  }

  const criticalPrompt = logTail.match(/Critical phase failed:\s*([^\n]+)/i);
  if (criticalPrompt?.[1]) {
    return `Plamen critical phase failed: ${criticalPrompt[1].trim()}`;
  }

  if (/Press ENTER to retry\s+\|\s+S to skip/i.test(logTail)) {
    return 'Plamen stopped at an interactive critical-failure prompt';
  }

  return null;
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

async function terminateAuditProcess(pid, { graceMs = 3000 } = {}) {
  if (!pid || !isProcessAlive(pid)) return;

  const sendSignal = (sig) => {
    try {
      process.kill(-pid, sig); // detached child is its own process-group leader
      return;
    } catch {
      // Fall through to direct PID kill. This also covers older rows whose
      // process group may no longer exist.
    }
    try { process.kill(pid, sig); } catch { /* already gone */ }
  };

  sendSignal('SIGTERM');
  await new Promise((r) => setTimeout(r, graceMs));
  if (isProcessAlive(pid)) {
    sendSignal('SIGKILL');
  }
}

async function getAuditRow(address, network) {
  const r = await pool.query(
    `SELECT id, address, network, audit_tool, audit_mode, tool_version,
            status, started_at, completed_at, duration_ms,
            critical_count, high_count, medium_count, low_count,
            informational_count, error_message,
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
        critical_count, high_count, medium_count, low_count,
        informational_count, log_path, phase)
     VALUES ($1, $2, 'plamen', $3, 'running', $4, 0, 0, 0, 0, 0, $5, NULL)
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
    const existingTail = existing.log_path ? tailFile(existing.log_path, 4096) : '';
    const terminalFailure = detectTerminalAuditFailure(existingTail);
    if (terminalFailure) {
      await terminateAuditProcess(existing.pid, { graceMs: 1000 });
      await markFailed(existing.id, terminalFailure);
    } else if (isProcessAlive(existing.pid)) {
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
  const wrapperLogPath = logPath + '.wrapper';

  try {
    fs.writeFileSync(logPath, '');
    fs.writeFileSync(wrapperLogPath, '');
  } catch (err) {
    return { ok: false, error: `Cannot initialize audit logs: ${err.message}` };
  }

  const auditId = await upsertRunningRow({ address: addr, network: net, mode: m, logPath });

  // Spawn detached so the audit survives a backend restart. Stdout / stderr
  // already redirect to LOG_FILE inside audit-one.sh, but we also capture the
  // wrapper's own startup output for diagnostics.
  let child;
  try {
    const wrapperLog = fs.openSync(wrapperLogPath, 'a');
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
  child.on('exit', (code, signal) => {
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
        const reason = code === null
          ? `audit-one.sh terminated by signal ${signal || 'unknown'}`
          : `audit-one.sh exited with code ${code}`;
        await markFailed(auditId, reason);
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
  let terminalFailure = null;
  if (row.log_path) {
    logTail = tailFile(row.log_path, 4096);
    detectedPhase = detectPhase(logTail);
    if (isLogCurrentForRun(row.log_path, row.started_at)) {
      terminalFailure = detectTerminalAuditFailure(logTail);
    }
  }

  // If the row says 'running' but the log already contains a terminal Plamen
  // halt, finalize it here. Otherwise a non-interactive prompt can keep the
  // process technically alive forever while the UI keeps polling "running".
  let liveStatus = row.status;
  let completedAt = row.completed_at;
  let durationMs = row.duration_ms;
  let errorMessage = row.error_message;
  if (row.status === 'running' && terminalFailure) {
    await terminateAuditProcess(row.pid, { graceMs: 1000 });
    await markFailed(row.id, terminalFailure);
    const updated = await getAuditRow(addr, net);
    liveStatus = updated?.status || 'failed';
    completedAt = updated?.completed_at || Date.now();
    durationMs = updated?.duration_ms || null;
    errorMessage = updated?.error_message || terminalFailure;
  }
  if (liveStatus === 'running' && row.pid && !isProcessAlive(row.pid)) {
    liveStatus = 'stalled';
  }

  // Persist the phase whenever we've made progress (so the next caller doesn't
  // need the log file to render something useful).
  if (detectedPhase && detectedPhase !== row.phase && row.status === 'running' && !terminalFailure) {
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
      completed_at: completedAt,
      duration_ms: durationMs,
      critical_count: row.critical_count,
      high_count: row.high_count,
      medium_count: row.medium_count,
      low_count: row.low_count,
      informational_count: row.informational_count,
      error_message: errorMessage,
      phase: detectedPhase || row.phase || null,
      log_tail: logTail
        ? logTail.split('\n').filter(Boolean).slice(-20).join('\n')
        : null,
    },
  };
}

/**
 * Cancel a running Plamen audit for the given contract.
 *
 * Sends SIGTERM to the spawn'd process group (so plamen's child agents die
 * too), waits briefly, then SIGKILL on holdouts, and marks the DB row
 * 'cancelled'. Safe to call when nothing is running — returns an explanatory
 * `ok: false` rather than mutating state.
 *
 * Returns `{ ok, audit, error }` shaped like triggerAudit.
 */
async function cancelAudit({ address, network }) {
  const addr = normalizeAddress(address);
  const net = normalizeNetwork(network);

  if (!isValidAddress(addr)) return { ok: false, error: 'Invalid contract address' };
  if (!net) return { ok: false, error: 'Network is required' };

  const row = await getAuditRow(addr, net);
  if (!row) return { ok: false, error: 'No audit found for this contract' };
  if (row.status !== 'running' && row.status !== 'pending') {
    return {
      ok: false,
      error: `Cannot cancel audit in '${row.status}' state`,
      audit: row,
    };
  }

  await terminateAuditProcess(row.pid);

  const now = Date.now();
  await pool.query(
    `UPDATE contract_audits
        SET status = 'cancelled',
            completed_at = $1,
            duration_ms = COALESCE($1 - started_at, 0),
            error_message = 'Cancelled by user',
            pid = NULL
      WHERE id = $2`,
    [now, row.id]
  );

  const updated = await getAuditRow(addr, net);
  return { ok: true, audit: updated };
}

/**
 * Project directory layout convention (see audit-one.sh):
 *   <AUDIT_ROOT>/<network>-<address>/AUDIT_REPORT.md
 */
function projectDir(address, network) {
  return path.join(AUDIT_ROOT, `${network}-${address}`);
}

function reportPath(address, network) {
  return path.join(projectDir(address, network), 'AUDIT_REPORT.md');
}

/**
 * Run the ingest CLI for a finished audit. Resolves with stdout (JSON) on
 * success, rejects with stderr on failure. Used by the reconciler to import
 * reports that the wrapper produced but never registered.
 */
function ingestReport({ address, network, mode, startedAt }) {
  return new Promise((resolve, reject) => {
    const args = [
      INGEST_JS,
      '--network', network,
      '--address', address,
      '--report', reportPath(address, network),
      '--mode', mode || 'thorough',
      '--status', 'completed',
    ];
    if (startedAt) {
      args.push('--started-at', String(startedAt));
    }
    const child = spawn('node', args, {
      cwd: REPO_ROOT,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '', err = '';
    child.stdout.on('data', (b) => { out += b.toString(); });
    child.stderr.on('data', (b) => { err += b.toString(); });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve(out.trim());
      else reject(new Error(`ingest.js exit ${code}: ${err.trim() || out.trim()}`));
    });
  });
}

/**
 * Reconcile orphaned audit rows.
 *
 * Finds rows still marked 'running' whose PID is null or dead. For each:
 *   - If AUDIT_REPORT.md exists → ingest it (flips to 'completed').
 *   - Otherwise → mark 'failed' with a diagnostic message.
 *
 * Designed to be safe to call concurrently (it only mutates rows whose status
 * is still 'running' via WHERE clauses) and idempotent across restarts.
 */
async function reconcileOrphanedAudits() {
  const cutoff = Date.now() - RECONCILER_MIN_AGE_MS;
  let rows;
  try {
    const r = await pool.query(
      `SELECT id, address, network, audit_mode, pid, started_at, log_path
         FROM contract_audits
        WHERE status = 'running'
          AND (started_at IS NULL OR started_at < $1)`,
      [cutoff]
    );
    rows = r.rows;
  } catch (err) {
    console.error('[audit-reconciler] DB scan failed:', err.message);
    return { scanned: 0, ingested: 0, failed: 0 };
  }

  let ingested = 0;
  let failed = 0;
  for (const row of rows) {
    const logTail = row.log_path ? tailFile(row.log_path, 4096) : '';
    const terminalFailure = row.log_path && isLogCurrentForRun(row.log_path, row.started_at)
      ? detectTerminalAuditFailure(logTail)
      : null;
    if (terminalFailure) {
      try {
        await terminateAuditProcess(row.pid, { graceMs: 1000 });
        await markFailed(row.id, terminalFailure);
        console.log(
          `[audit-reconciler] marked audit ${row.id} failed ` +
          `(${row.network}/${row.address}) — ${terminalFailure}`
        );
        failed++;
      } catch (err) {
        console.error(
          `[audit-reconciler] terminal-failure handling failed for audit ${row.id}: ${err.message}`
        );
      }
      continue;
    }

    if (row.pid && isProcessAlive(row.pid)) continue; // genuinely still running

    const rpt = reportPath(row.address, row.network);
    if (fs.existsSync(rpt)) {
      try {
        await ingestReport({
          address: row.address,
          network: row.network,
          mode: row.audit_mode,
          startedAt: row.started_at,
        });
        console.log(
          `[audit-reconciler] ingested audit ${row.id} ` +
          `(${row.network}/${row.address}) from existing report`
        );
        ingested++;
      } catch (err) {
        console.error(
          `[audit-reconciler] ingest failed for audit ${row.id} ` +
          `(${row.network}/${row.address}): ${err.message}`
        );
      }
    } else {
      try {
        await markFailed(
          row.id,
          'wrapper exited without producing AUDIT_REPORT.md (likely killed mid-run)'
        );
        console.log(
          `[audit-reconciler] marked audit ${row.id} failed ` +
          `(${row.network}/${row.address}) — no report`
        );
        failed++;
      } catch (err) {
        console.error(
          `[audit-reconciler] markFailed failed for audit ${row.id}: ${err.message}`
        );
      }
    }
  }
  return { scanned: rows.length, ingested, failed };
}

/**
 * Start the reconciler loop. Runs once immediately, then on a timer.
 * Returns the interval handle so callers (tests) can stop it.
 */
function startReconciler({ intervalMs = RECONCILER_INTERVAL_MS } = {}) {
  // Fire immediately so a fresh boot heals orphans from the previous run.
  reconcileOrphanedAudits().catch((err) => {
    console.error('[audit-reconciler] initial pass error:', err.message);
  });
  const handle = setInterval(() => {
    reconcileOrphanedAudits().catch((err) => {
      console.error('[audit-reconciler] periodic pass error:', err.message);
    });
  }, intervalMs);
  handle.unref?.();
  return handle;
}

module.exports = {
  triggerAudit,
  getAuditStatus,
  cancelAudit,
  reconcileOrphanedAudits,
  startReconciler,
};
