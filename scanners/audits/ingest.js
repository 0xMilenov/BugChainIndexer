#!/usr/bin/env node
/**
 * Parse a Plamen AUDIT_REPORT.md and persist its findings to Postgres.
 *
 * Only critical/high/medium are stored. Low and Informational findings are
 * counted but not written to contract_audit_findings — policy decision per
 * the integration spec (the dashboard shouldn't surface noise).
 *
 * Usage:
 *   node scanners/audits/ingest.js \
 *     --network ethereum --address 0xabc... \
 *     [--report /tmp/audits/ethereum-0xabc.../AUDIT_REPORT.md] \
 *     [--mode thorough] [--tool plamen]
 *
 * On success prints a one-line JSON summary on stdout.
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const PERSISTED_SEVERITIES = new Set(['critical', 'high', 'medium']);

function parseArgs(argv) {
  const args = {
    network: null, address: null, report: null,
    mode: 'thorough', tool: 'plamen', toolVersion: null,
    startedAt: null, status: 'completed'
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i], next = argv[i + 1];
    if (a === '--network') { args.network = next; i++; }
    else if (a === '--address') { args.address = next; i++; }
    else if (a === '--report') { args.report = next; i++; }
    else if (a === '--mode') { args.mode = next; i++; }
    else if (a === '--tool') { args.tool = next; i++; }
    else if (a === '--tool-version') { args.toolVersion = next; i++; }
    else if (a === '--started-at') { args.startedAt = Number(next); i++; }
    else if (a === '--status') { args.status = next; i++; }
    else if (a === '--help' || a === '-h') {
      console.error('Usage: ingest.js --network NAME --address 0x... [--report PATH] [--mode MODE] [--tool TOOL]');
      process.exit(0);
    }
  }
  if (!args.network || !args.address) {
    console.error('ERROR: --network and --address are required');
    process.exit(2);
  }
  args.address = args.address.toLowerCase();
  if (!args.report) {
    args.report = path.join('/tmp', 'audits', `${args.network}-${args.address}`, 'AUDIT_REPORT.md');
  }
  return args;
}

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const candidates = [
    path.resolve(__dirname, '..', '..', 'server', 'backend', '.env'),
    '/home/claude/BugChainIndexer/server/backend/.env'
  ];
  for (const envPath of candidates) {
    if (!fs.existsSync(envPath)) continue;
    const text = fs.readFileSync(envPath, 'utf8');
    const m = text.match(/^DATABASE_URL=(.+)$/m);
    if (m) return m[1].trim();
  }
  throw new Error('DATABASE_URL unset and no .env file found');
}

/**
 * Normalize the severity string Plamen emits into our 3 stored buckets or a
 * "skip" marker. We deliberately accept only exact matches — a missing/weird
 * severity field should surface, not silently degrade to Medium.
 */
function normalizeSeverity(raw) {
  if (!raw) return null;
  const s = String(raw).trim().toLowerCase().replace(/[*`]/g, '');
  if (s.startsWith('critical')) return 'critical';
  if (s.startsWith('high')) return 'high';
  if (s.startsWith('medium')) return 'medium';
  if (s.startsWith('low')) return 'low';
  if (s.startsWith('info')) return 'informational';
  return null;
}

/**
 * Split the report on `### [X-NN] …` section headers. Returns an array of
 * {header, body} objects in document order.
 */
function splitFindingSections(reportText) {
  const sections = [];
  const re = /(^|\n)### \[([CHMLIcmli])-(\d+)\][^\n]*\n/g;
  const hits = [];
  let m;
  while ((m = re.exec(reportText)) !== null) {
    hits.push({ index: m.index + m[1].length, match: m[0] });
  }
  for (let i = 0; i < hits.length; i++) {
    const start = hits[i].index;
    const end = i + 1 < hits.length ? hits[i + 1].index : reportText.length;
    const block = reportText.slice(start, end);
    const firstNl = block.indexOf('\n');
    sections.push({
      header: block.slice(0, firstNl).trim(),
      body: block.slice(firstNl + 1).trim()
    });
  }
  return sections;
}

/**
 * Extract a block labelled by a bold field marker like `**Description**:`.
 * Stops at the next bold field or end of section. Trims aggressively.
 */
function extractField(body, fieldName) {
  const re = new RegExp(
    `\\*\\*${fieldName}\\*\\*[ \\t]*:?[ \\t]*\\n?([\\s\\S]*?)(?=\\n\\*\\*[A-Z][^*\\n]{1,40}\\*\\*[ \\t]*:|\\n### |\\n## |$)`,
    'i'
  );
  const m = body.match(re);
  if (!m) return null;
  const val = m[1].replace(/^\s+|\s+$/g, '');
  return val || null;
}

/**
 * Parse the `## Summary` counts table. Used as a sanity check — we still
 * trust the per-finding sections as the authoritative source of truth.
 */
function parseSummaryCounts(reportText) {
  const out = { critical: 0, high: 0, medium: 0, low: 0, informational: 0 };
  const summaryIdx = reportText.search(/^##\s+Summary\b/mi);
  if (summaryIdx === -1) return out;
  const slice = reportText.slice(summaryIdx, summaryIdx + 4000);
  for (const line of slice.split('\n')) {
    const m = line.match(/\|\s*(Critical|High|Medium|Low|Informational)\s*\|\s*(\d+)\s*\|/i);
    if (m) {
      const sev = normalizeSeverity(m[1]);
      if (sev && sev in out) out[sev] = Number(m[2]);
    }
  }
  return out;
}

function parseHeader(header) {
  // e.g. "### [C-01] Reentrancy in withdraw [VERIFIED]"
  const m = header.match(/^###\s+\[([CHMLIcmli])-(\d+)\]\s*(.+?)\s*(?:\[(VERIFIED|UNVERIFIED|CONTESTED)\])?\s*$/);
  if (!m) return null;
  const sevLetter = m[1].toUpperCase();
  const sevMap = { C: 'critical', H: 'high', M: 'medium', L: 'low', I: 'informational' };
  return {
    severityFromId: sevMap[sevLetter] || null,
    idIndex: Number(m[2]),
    title: m[3].trim(),
    status: m[4] || null
  };
}

function parseReport(reportText) {
  const findings = [];
  const summary = parseSummaryCounts(reportText);
  for (const { header, body } of splitFindingSections(reportText)) {
    const h = parseHeader(header);
    if (!h) continue;
    const severityField = normalizeSeverity(extractField(body, 'Severity'));
    // Trust the per-finding **Severity** field over the ID letter when both
    // are present — Plamen's matrix can downgrade a finding from its initial ID.
    const severity = severityField || h.severityFromId;
    findings.push({
      severity,
      title: h.title,
      description: extractField(body, 'Description'),
      impact: extractField(body, 'Impact'),
      location: extractField(body, 'Location'),
      recommendation: extractField(body, 'Recommendation'),
      proofOfConcept: extractField(body, 'PoC Result') || extractField(body, 'Proof of Concept'),
      confidence: extractField(body, 'Confidence'),
      status: h.status,
      idIndex: h.idIndex
    });
  }
  return { findings, summary };
}

async function upsertAudit(client, args, parsed, rawReport) {
  const now = Date.now();
  const counts = parsed.findings.reduce((acc, f) => {
    if (f.severity === 'critical') acc.critical++;
    else if (f.severity === 'high') acc.high++;
    else if (f.severity === 'medium') acc.medium++;
    return acc;
  }, { critical: 0, high: 0, medium: 0 });

  const startedAt = args.startedAt || now;
  const durationMs = now - startedAt;

  const upsert = await client.query(
    `INSERT INTO contract_audits (
        address, network, audit_tool, audit_mode, tool_version,
        status, started_at, completed_at, duration_ms,
        raw_report, report_path,
        critical_count, high_count, medium_count
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     ON CONFLICT (address, network, audit_tool) DO UPDATE SET
        audit_mode = EXCLUDED.audit_mode,
        tool_version = EXCLUDED.tool_version,
        status = EXCLUDED.status,
        started_at = EXCLUDED.started_at,
        completed_at = EXCLUDED.completed_at,
        duration_ms = EXCLUDED.duration_ms,
        raw_report = EXCLUDED.raw_report,
        report_path = EXCLUDED.report_path,
        critical_count = EXCLUDED.critical_count,
        high_count = EXCLUDED.high_count,
        medium_count = EXCLUDED.medium_count,
        error_message = NULL
     RETURNING id`,
    [
      args.address, args.network, args.tool, args.mode, args.toolVersion,
      args.status, startedAt, now, durationMs,
      rawReport, args.report,
      counts.critical, counts.high, counts.medium
    ]
  );
  const auditId = upsert.rows[0].id;

  // Replace previous findings for this audit wholesale — simpler than diffing
  // and keeps the table consistent with whatever the latest report says.
  await client.query('DELETE FROM contract_audit_findings WHERE audit_id = $1', [auditId]);

  let insertedCount = 0;
  for (const f of parsed.findings) {
    if (!PERSISTED_SEVERITIES.has(f.severity)) continue;
    await client.query(
      `INSERT INTO contract_audit_findings (
          audit_id, severity, title, description, location,
          recommendation, proof_of_concept, finding_index, created_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        auditId, f.severity, f.title,
        [f.description, f.impact && `\n\n**Impact**\n\n${f.impact}`].filter(Boolean).join(''),
        f.location, f.recommendation, f.proofOfConcept,
        f.idIndex, now
      ]
    );
    insertedCount++;
  }

  return { auditId, counts, insertedCount };
}

async function main() {
  const args = parseArgs(process.argv);
  if (!fs.existsSync(args.report)) {
    console.error(`ERROR: report not found: ${args.report}`);
    process.exit(3);
  }
  const rawReport = fs.readFileSync(args.report, 'utf8');
  const parsed = parseReport(rawReport);

  const pool = new Pool({ connectionString: loadDatabaseUrl() });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await upsertAudit(client, args, parsed, rawReport);
    await client.query('COMMIT');
    const summary = {
      address: args.address,
      network: args.network,
      tool: args.tool,
      mode: args.mode,
      auditId: result.auditId,
      counts: result.counts,
      persistedFindings: result.insertedCount,
      summaryTable: parsed.summary,
      totalParsed: parsed.findings.length,
      reportBytes: rawReport.length
    };
    process.stdout.write(JSON.stringify(summary) + '\n');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(`ERROR: ${err.stack || err.message || err}`);
    process.exit(1);
  });
}

module.exports = { parseReport, parseSummaryCounts, splitFindingSections, parseHeader, extractField };
