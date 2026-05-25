const fs = require('fs/promises');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { pool, ensureDbUrl } = require('./db');

const execFileAsync = promisify(execFile);
const PROJECT_ROOT = path.resolve(__dirname, '../../..');
const SCANNER_LOG_DIR = process.env.SCANNER_LOG_DIR || path.join(PROJECT_ROOT, 'scanners', 'logs');
const RUNNER_LOG = path.join(SCANNER_LOG_DIR, 'runner.log');
const SCANNER_PROCESS_PATTERN = /\b(UnifiedScanner|FundUpdater|ERC20TokenBalanceScanner|DataRevalidator)\b|run\.sh\s+(unified|funds|erc20|revalidate)|cron-unified-(cautious|fast|slow)\.sh/i;

function nowSec() {
  return Math.floor(Date.now() / 1000);
}

function todayStartSec() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return Math.floor(d.getTime() / 1000);
}

async function readTail(filePath, maxBytes = 200000) {
  try {
    const stat = await fs.stat(filePath);
    const start = Math.max(0, stat.size - maxBytes);
    const handle = await fs.open(filePath, 'r');
    try {
      const buffer = Buffer.alloc(stat.size - start);
      await handle.read(buffer, 0, buffer.length, start);
      return buffer.toString('utf8');
    } finally {
      await handle.close();
    }
  } catch (_) {
    return '';
  }
}

function parseRunnerLog(contents) {
  const lines = contents.split(/\r?\n/).filter(Boolean);
  let lastStart = null;
  let lastCompletion = null;
  let lastFailure = null;

  for (const line of lines) {
    const dateMatch = line.match(/^\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\]/);
    const timestamp = dateMatch ? Math.floor(new Date(`${dateMatch[1]}Z`).getTime() / 1000) : null;
    if (line.includes('Starting UnifiedScanner pipeline')) {
      lastStart = { timestamp, line };
    }
    if (line.includes('UnifiedScanner completed for')) {
      lastCompletion = { timestamp, line };
    }
    if (line.includes('UnifiedScanner failed for') || line.includes('ERROR: UnifiedScanner failed')) {
      lastFailure = { timestamp, line };
    }
  }

  return { last_start: lastStart, last_completion: lastCompletion, last_failure: lastFailure };
}

function parseDurationToSeconds(value) {
  const match = String(value || '').match(/(\d{2}):(\d{2}):(\d{2})/);
  if (!match) return null;
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
}

function isScannerErrorLine(line) {
  if (/errorRate/i.test(line)) return false;
  return /(\bERROR\b|\bfailed\b|\btimeout\b|rate limit|too many requests|\[TEMPORARY\]|\[PERMANENT\]|\[TIMEOUT\])/i.test(line);
}

function parseNetworkLog(fileName, contents, mtimeMs) {
  const nameMatch = fileName.match(/^UnifiedScanner-(.+)-(\d{8}_\d{6})\.log$/);
  const network = nameMatch ? nameMatch[1] : fileName.replace(/^UnifiedScanner-/, '').replace(/\.log$/, '');
  const lines = contents.split(/\r?\n/).filter(Boolean);
  const tail = lines.slice(-8);
  const getLogsDurations = [];
  let scanRange = null;
  let stored = 0;
  let completed = false;
  let errorCount = 0;

  for (const line of lines) {
    const durationMatch = line.match(/getLogs completed in (\d+)ms/);
    if (durationMatch) getLogsDurations.push(Number(durationMatch[1]));

    const rangeMatch = line.match(/Scan range: blocks (\d+) .+ (\d+) \((\d+) blocks\)/);
    if (rangeMatch) {
      scanRange = {
        from_block: Number(rangeMatch[1]),
        to_block: Number(rangeMatch[2]),
        blocks: Number(rangeMatch[3]),
      };
    }

    const storedMatch = line.match(/Stored:\s+(\d+)\s+verified contracts/);
    if (storedMatch) stored += Number(storedMatch[1]);
    if (line.includes('PIPELINE COMPLETE')) completed = true;
    if (isScannerErrorLine(line)) errorCount += 1;
  }

  const avgGetLogsMs = getLogsDurations.length
    ? Math.round(getLogsDurations.reduce((sum, n) => sum + n, 0) / getLogsDurations.length)
    : null;

  return {
    network,
    file: fileName,
    updated_at: Math.floor(mtimeMs / 1000),
    completed,
    scan_range: scanRange,
    get_logs_requests: getLogsDurations.length,
    avg_get_logs_ms: avgGetLogsMs,
    stored,
    errors: errorCount,
    last_line: tail[tail.length - 1] || null,
  };
}

async function getLatestNetworkLogs() {
  try {
    const entries = await fs.readdir(SCANNER_LOG_DIR, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile() && /^UnifiedScanner-.+\.log$/.test(entry.name))
      .map((entry) => entry.name);

    const stats = await Promise.all(files.map(async (file) => {
      const fullPath = path.join(SCANNER_LOG_DIR, file);
      const stat = await fs.stat(fullPath);
      return { file, mtimeMs: stat.mtimeMs };
    }));

    const latestByNetwork = new Map();
    for (const item of stats.sort((a, b) => b.mtimeMs - a.mtimeMs)) {
      const match = item.file.match(/^UnifiedScanner-(.+)-\d{8}_\d{6}\.log$/);
      const network = match?.[1];
      if (!network || latestByNetwork.has(network)) continue;
      latestByNetwork.set(network, item);
    }

    const latest = Array.from(latestByNetwork.values()).slice(0, 24);
    return Promise.all(latest.map(async (item) => {
      const contents = await readTail(path.join(SCANNER_LOG_DIR, item.file), 2 * 1024 * 1024);
      return parseNetworkLog(item.file, contents, item.mtimeMs);
    }));
  } catch (_) {
    return [];
  }
}

async function getRunningScanners() {
  try {
    const user = process.env.SCANNER_PROCESS_USER || process.env.USER || 'claude';
    const { stdout } = await execFileAsync('ps', ['-u', user, '-o', 'pid,ppid,stat,etime,cmd'], {
      timeout: 3000,
      maxBuffer: 1024 * 512,
    });
    return stdout
      .split(/\r?\n/)
      .slice(1)
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => SCANNER_PROCESS_PATTERN.test(line))
      .map((line) => {
        const parts = line.split(/\s+/);
        return {
          pid: Number(parts[0]),
          stat: parts[2] || '',
          etime: parts[3] || '',
          cmd: parts.slice(4).join(' ').replace(PROJECT_ROOT, ''),
        };
      });
  } catch (_) {
    return [];
  }
}

function cronFieldMatches(field, value, min, max) {
  if (field === '*') return true;

  return field.split(',').some((part) => {
    const stepMatch = part.match(/^\*\/(\d+)$/);
    if (stepMatch) {
      const step = Number(stepMatch[1]);
      return Number.isFinite(step) && step > 0 && (value - min) % step === 0;
    }

    const rangeMatch = part.match(/^(\d+)-(\d+)(?:\/(\d+))?$/);
    if (rangeMatch) {
      const start = Number(rangeMatch[1]);
      const end = Number(rangeMatch[2]);
      const step = rangeMatch[3] ? Number(rangeMatch[3]) : 1;
      return value >= start && value <= end && (value - start) % step === 0;
    }

    const n = Number(part);
    if (!Number.isFinite(n)) return false;
    if (max === 7 && n === 7) return value === 0;
    return value === n;
  });
}

function cronScheduleMatches(fields, date) {
  return (
    cronFieldMatches(fields[0], date.getMinutes(), 0, 59) &&
    cronFieldMatches(fields[1], date.getHours(), 0, 23) &&
    cronFieldMatches(fields[2], date.getDate(), 1, 31) &&
    cronFieldMatches(fields[3], date.getMonth() + 1, 1, 12) &&
    cronFieldMatches(fields[4], date.getDay(), 0, 7)
  );
}

function computeNextCronRun(schedule, from = new Date()) {
  const fields = String(schedule || '').trim().split(/\s+/).slice(0, 5);
  if (fields.length !== 5) return null;

  const next = new Date(from.getTime() + 60 * 1000);
  next.setSeconds(0, 0);

  for (let i = 0; i < 60 * 24 * 14; i += 1) {
    if (cronScheduleMatches(fields, next)) {
      return Math.floor(next.getTime() / 1000);
    }
    next.setMinutes(next.getMinutes() + 1);
  }

  return null;
}

function getScannerProfileFromCron(line) {
  const match = line.match(/cron-unified-(cautious|fast|slow)\.sh/);
  return match?.[1] || 'unified';
}

async function getCronStatus() {
  try {
    const { stdout } = await execFileAsync('crontab', ['-l'], {
      timeout: 3000,
      maxBuffer: 1024 * 256,
    });
    const activeLines = stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'));
    const scannerLines = activeLines.filter((line) => /cron-unified(-cautious|-fast|-slow)?\.sh/.test(line));
    const jobs = scannerLines
      .map((line) => {
        const schedule = line.split(/\s+/).slice(0, 5).join(' ');
        return {
          profile: getScannerProfileFromCron(line),
          schedule,
          command: line.replace(/\s+#.*$/, ''),
          next_run_at: computeNextCronRun(schedule),
        };
      })
      .sort((a, b) => (a.next_run_at || Number.MAX_SAFE_INTEGER) - (b.next_run_at || Number.MAX_SAFE_INTEGER));

    return {
      enabled: jobs.length > 0,
      schedule: jobs.length === 1 ? jobs[0].schedule : (jobs.length ? `${jobs.length} scanner jobs` : null),
      command: jobs.length === 1 ? jobs[0].command : null,
      next_run_at: jobs[0]?.next_run_at || null,
      jobs,
    };
  } catch (_) {
    return { enabled: false, schedule: null, command: null, next_run_at: null, jobs: [] };
  }
}

async function getDbStats() {
  ensureDbUrl();
  const start = todayStartSec();
  const day = new Date().toISOString().slice(0, 10);
  const [collection, budget, rpcHealth] = await Promise.all([
    pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE first_seen >= $1)::bigint AS collected_today,
        COUNT(*) FILTER (WHERE first_seen >= $1 AND verified = true)::bigint AS verified_today,
        MAX(first_seen)::bigint AS last_contract_at
      FROM addresses
    `, [start]),
    pool.query(`
      SELECT COALESCE(SUM(request_count), 0)::bigint AS requests
      FROM explorer_api_budget
      WHERE budget_date = $1::date
    `, [day]).catch(() => ({ rows: [{ requests: 0 }] })),
    pool.query(`
      SELECT
        COUNT(*)::int AS endpoints,
        COUNT(*) FILTER (WHERE healthy = true)::int AS healthy,
        ROUND(AVG(latency_ms))::int AS avg_latency_ms,
        MAX(last_checked)::bigint AS last_checked
      FROM rpc_endpoint_health
    `).catch(() => ({ rows: [{ endpoints: 0, healthy: 0, avg_latency_ms: null, last_checked: null }] })),
  ]);

  const row = collection.rows[0] || {};
  return {
    collected_today: Number(row.collected_today || 0),
    verified_today: Number(row.verified_today || 0),
    last_contract_at: row.last_contract_at ? Number(row.last_contract_at) : null,
    explorer_requests_today: Number(budget.rows[0]?.requests || 0),
    rpc_health: {
      endpoints: Number(rpcHealth.rows[0]?.endpoints || 0),
      healthy: Number(rpcHealth.rows[0]?.healthy || 0),
      avg_latency_ms: rpcHealth.rows[0]?.avg_latency_ms == null ? null : Number(rpcHealth.rows[0].avg_latency_ms),
      last_checked: rpcHealth.rows[0]?.last_checked == null ? null : Number(rpcHealth.rows[0].last_checked),
    },
  };
}

exports.getScannerHealth = async () => {
  const [runnerLog, networkLogs, running, cron, db] = await Promise.all([
    readTail(RUNNER_LOG, 300000),
    getLatestNetworkLogs(),
    getRunningScanners(),
    getCronStatus(),
    getDbStats(),
  ]);

  const runner = parseRunnerLog(runnerLog);
  const getLogs = networkLogs.flatMap((n) => (
    n.avg_get_logs_ms && n.get_logs_requests
      ? Array(n.get_logs_requests).fill(n.avg_get_logs_ms)
      : []
  ));
  const avgGetLogsMs = getLogs.length
    ? Math.round(getLogs.reduce((sum, n) => sum + n, 0) / getLogs.length)
    : null;

  return {
    generated_at: nowSec(),
    running: running.length > 0,
    running_count: running.length,
    running_processes: running.slice(0, 12),
    cron,
    db,
    runner,
    rpc: {
      get_logs_requests: networkLogs.reduce((sum, n) => sum + n.get_logs_requests, 0),
      avg_get_logs_ms: avgGetLogsMs,
      errors: networkLogs.reduce((sum, n) => sum + n.errors, 0),
    },
    recent_networks: networkLogs
      .sort((a, b) => b.updated_at - a.updated_at)
      .slice(0, 12),
  };
};
