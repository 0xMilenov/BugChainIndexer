#!/usr/bin/env node
/**
 * Parse a Plamen AUDIT_REPORT.md and persist its findings to Postgres.
 *
 * Critical/high/medium/low/informational findings are stored. We also retain
 * report-index metadata so demoted findings remain traceable to their original
 * severity and proof artifacts.
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

const SEVERITIES = ['critical', 'high', 'medium', 'low', 'informational'];
const PERSISTED_SEVERITIES = new Set(SEVERITIES);
const EVIDENCE_TAG_ORDER = [
  '[POC-PASS]',
  '[MEDUSA-PASS]',
  '[PROD-ONCHAIN]',
  '[PROD-FORK]',
  '[PROD-SOURCE]',
  '[POC-FAIL]',
  '[CODE-TRACE]'
];
const EVIDENCE_TAG_STRENGTH = new Map(
  EVIDENCE_TAG_ORDER.map((tag, index) => [tag, EVIDENCE_TAG_ORDER.length - index])
);

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
  args.network = String(args.network).trim().toLowerCase();
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
 * Normalize the severity string Plamen emits into our stored buckets or a
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

function normalizeReportId(raw) {
  if (!raw) return null;
  const m = String(raw).trim().match(/^([CHMLI])-(\d+)$/i);
  if (!m) return null;
  return `${m[1].toUpperCase()}-${String(Number(m[2])).padStart(2, '0')}`;
}

function parseReportIndexEntries(reportText) {
  const out = new Map();
  const indexStart = reportText.search(/^##\s+Master Finding Index\b/mi);
  if (indexStart === -1) return out;

  const nextSection = reportText.slice(indexStart + 1).search(/\n##\s+/m);
  const slice = nextSection === -1
    ? reportText.slice(indexStart)
    : reportText.slice(indexStart, indexStart + 1 + nextSection);

  let headers = null;
  for (const line of slice.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|')) continue;

    const cols = trimmed
      .split('|')
      .slice(1, -1)
      .map((col) => col.trim());
    if (cols.length < 2) continue;
    if (cols.every((col) => /^-+$/.test(col.replace(/\s+/g, '')))) continue;
    if (/^report id$/i.test(cols[0])) {
      headers = cols.map((col) => col.toLowerCase());
      continue;
    }

    const get = (name, fallbackIndex) => {
      const idx = headers ? headers.indexOf(name) : -1;
      return cols[idx >= 0 ? idx : fallbackIndex] || '';
    };
    const id = normalizeReportId(get('report id', 0));
    const title = cols[1]
      .replace(/`/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!id || !title) continue;
    out.set(id, {
      reportId: id,
      title,
      severity: normalizeSeverity(get('severity', 2)),
      location: get('location', 3).replace(/`/g, '').replace(/\s+/g, ' ').trim() || null,
      verificationStatus: get('verification', 4).replace(/`/g, '').trim() || null,
      trustAdjustment: get('trust adj.', 5).replace(/`/g, '').trim() || null,
      sourceFindingId: get('internal hypothesis', 6).replace(/`/g, '').trim() || null
    });
  }

  return out;
}

function parseReportIndexTitles(reportText) {
  const out = new Map();
  for (const [id, entry] of parseReportIndexEntries(reportText)) {
    out.set(id, entry.title);
  }
  return out;
}

function loadReportIndexText(reportPath) {
  const dir = path.dirname(reportPath);
  const candidates = [
    path.join(dir, '.scratchpad', 'report_index.md'),
    path.join(dir, 'report_index.md')
  ];
  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) return fs.readFileSync(candidate, 'utf8');
    } catch {
      // Ignore sidecar read failures; the main report can still be ingested.
    }
  }
  return '';
}

function trimSectionValue(value) {
  if (!value) return value;
  return value
    .replace(/\n\s*---\s*$/s, '')
    .replace(/^\s+|\s+$/g, '') || null;
}

function cleanLocation(value) {
  if (!value) return value;
  return value
    .replace(/`/g, '')
    .replace(/\s+/g, ' ')
    .trim() || null;
}

function normalizeEvidenceTag(raw) {
  if (!raw) return null;
  const m = String(raw).toUpperCase().match(/\[?(POC-PASS|POC-FAIL|CODE-TRACE|MEDUSA-PASS|PROD-ONCHAIN|PROD-SOURCE|PROD-FORK)\]?/);
  return m ? `[${m[1]}]` : null;
}

function extractEvidenceTags(text) {
  const out = [];
  if (!text) return out;
  const re = /\[?(POC-PASS|POC-FAIL|CODE-TRACE|MEDUSA-PASS|PROD-ONCHAIN|PROD-SOURCE|PROD-FORK)\]?/gi;
  let m;
  while ((m = re.exec(String(text))) !== null) {
    const tag = normalizeEvidenceTag(m[1]);
    if (tag && !out.includes(tag)) out.push(tag);
  }
  return out;
}

function selectBestEvidenceTag(tags) {
  let best = null;
  let bestScore = -1;
  for (const tag of tags || []) {
    const normalized = normalizeEvidenceTag(tag);
    const score = EVIDENCE_TAG_STRENGTH.get(normalized) || 0;
    if (normalized && score > bestScore) {
      best = normalized;
      bestScore = score;
    }
  }
  return best;
}

function parseOriginalSeverityFromTrustAdjustment(value) {
  if (!value) return null;
  const m = String(value).match(/\((Critical|High|Medium|Low|Informational)\)/i);
  return normalizeSeverity(m?.[1]);
}

function titleTokens(title) {
  const stop = new Set(['the', 'and', 'or', 'a', 'an', 'of', 'to', 'in', 'on', 'for', 'with', 'by', 'from', 'can', 'lets', 'plus']);
  return new Set(
    String(title || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .split(/\s+/)
      .map((token) => token.replace(/(?:ing|ed|es|s)$/i, ''))
      .filter((token) => token.length > 2 && !stop.has(token))
  );
}

function titleSimilarity(a, b) {
  const aTokens = titleTokens(a);
  const bTokens = titleTokens(b);
  const denom = Math.min(aTokens.size, bTokens.size);
  if (denom === 0) return 0;
  let overlap = 0;
  for (const token of aTokens) {
    if (bTokens.has(token)) overlap++;
  }
  return overlap / denom;
}

function parseSupportingEvidenceSections(text, sourceFile) {
  const sections = [];
  if (!text) return sections;
  const re = /(^|\n)#{2,3}\s+(?:Finding\s+)?(?:\[([A-Z]+-\d+)\]\s*:?\s*)?([^\n]+)\n/g;
  const hits = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    hits.push({
      index: m.index + m[1].length,
      id: m[2] || null,
      title: (m[3] || '').trim()
    });
  }
  for (let i = 0; i < hits.length; i++) {
    const start = hits[i].index;
    const end = i + 1 < hits.length ? hits[i + 1].index : text.length;
    const block = text.slice(start, end);
    const firstNl = block.indexOf('\n');
    const body = firstNl >= 0 ? block.slice(firstNl + 1).trim() : '';
    const tags = extractEvidenceTags(block);
    if (!tags.length) continue;
    sections.push({
      id: hits[i].id,
      title: hits[i].title.replace(/^Finding\s+\[[^\]]+\]\s*:?\s*/i, '').trim(),
      severity: normalizeSeverity(extractField(body, 'Severity')),
      location: cleanLocation(trimSectionValue(extractField(body, 'Location'))),
      tags,
      sourceFile
    });
  }
  return sections;
}

function loadSupportingEvidence(reportPath) {
  const dir = path.dirname(reportPath);
  const candidates = [
    path.join(dir, '.scratchpad', 'medusa_fuzz_findings.md'),
    path.join(dir, '.scratchpad', 'invariant_fuzz_findings.md'),
    path.join(dir, '.scratchpad', 'invariant_fuzz_results.md'),
    path.join(dir, '.scratchpad', 'poc_results.md'),
    path.join(dir, '.scratchpad', 'poc_findings.md'),
    path.join(dir, '.scratchpad', 'exploit_intel.md'),
    path.join(dir, 'medusa_fuzz_findings.md'),
    path.join(dir, 'invariant_fuzz_findings.md'),
    path.join(dir, 'exploit_intel.md')
  ];
  const out = [];
  for (const candidate of candidates) {
    try {
      if (!fs.existsSync(candidate)) continue;
      const text = fs.readFileSync(candidate, 'utf8');
      out.push(...parseSupportingEvidenceSections(text, path.basename(candidate)));
    } catch {
      // Sidecar evidence is best-effort; never block ingestion of the report.
    }
  }
  return out;
}

function matchSupportingEvidence(finding, supportingEvidence) {
  const sourceId = (finding.sourceFindingId || '').trim().toUpperCase();
  const matches = [];
  for (const entry of supportingEvidence || []) {
    const entryId = (entry.id || '').trim().toUpperCase();
    const sim = titleSimilarity(finding.title, entry.title);
    if (sourceId && entryId && sourceId === entryId) {
      matches.push({ entry, score: 1 });
    } else if (sim >= 0.42) {
      matches.push({ entry, score: sim });
    }
  }
  return matches
    .sort((a, b) => b.score - a.score)
    .map((match) => match.entry);
}

function parseHeader(header) {
  // e.g. "### [C-01] Reentrancy in withdraw [VERIFIED]"
  const m = header.match(/^###\s+\[([CHMLIcmli])-(\d+)\]\s*(.+?)\s*(?:\[(VERIFIED|UNVERIFIED|CONTESTED)\])?\s*$/);
  if (!m) return null;
  const sevLetter = m[1].toUpperCase();
  const sevMap = { C: 'critical', H: 'high', M: 'medium', L: 'low', I: 'informational' };
  const idIndex = Number(m[2]);
  return {
    severityFromId: sevMap[sevLetter] || null,
    idIndex,
    reportId: `${sevLetter}-${String(idIndex).padStart(2, '0')}`,
    title: m[3].trim(),
    status: m[4] || null
  };
}

function parseReport(reportText, { indexText = '', supportingEvidence = [] } = {}) {
  const findings = [];
  const summary = parseSummaryCounts(reportText);
  const indexEntries = parseReportIndexEntries(indexText || reportText);
  for (const { header, body } of splitFindingSections(reportText)) {
    const h = parseHeader(header);
    if (!h) continue;
    const severityField = normalizeSeverity(extractField(body, 'Severity'));
    // Trust the per-finding **Severity** field over the ID letter when both
    // are present — Plamen's matrix can downgrade a finding from its initial ID.
    const severity = severityField || h.severityFromId;
    const indexEntry = indexEntries.get(h.reportId) || null;
    const indexedTitle = indexEntry?.title;
    const sectionEvidenceTags = [
      ...extractEvidenceTags(extractField(body, 'Evidence Tag')),
      ...extractEvidenceTags(body)
    ];
    const preliminary = {
      reportId: h.reportId,
      severity,
      title: indexedTitle || h.title,
      sourceFindingId: indexEntry?.sourceFindingId || null
    };
    const matchedEvidence = matchSupportingEvidence(preliminary, supportingEvidence);
    const supportingTags = matchedEvidence.flatMap((entry) => entry.tags || []);
    const evidenceTags = [...new Set([...sectionEvidenceTags, ...supportingTags])];
    const trustAdjustment = indexEntry?.trustAdjustment || null;
    const originalSeverity =
      parseOriginalSeverityFromTrustAdjustment(trustAdjustment) ||
      matchedEvidence.find((entry) => entry.severity)?.severity ||
      severity;
    findings.push({
      severity,
      originalSeverity,
      reportId: h.reportId,
      title: indexedTitle || h.title,
      description: trimSectionValue(extractField(body, 'Description')),
      impact: trimSectionValue(extractField(body, 'Impact')),
      location: cleanLocation(trimSectionValue(extractField(body, 'Location'))),
      recommendation: trimSectionValue(extractField(body, 'Recommendation')),
      proofOfConcept: trimSectionValue(extractField(body, 'PoC Result') || extractField(body, 'Proof of Concept')),
      confidence: trimSectionValue(extractField(body, 'Confidence')),
      evidenceTag: selectBestEvidenceTag(evidenceTags),
      evidenceTags,
      verificationStatus: h.status || indexEntry?.verificationStatus || null,
      trustAdjustment,
      sourceFindingId: indexEntry?.sourceFindingId || null,
      status: h.status,
      idIndex: h.idIndex
    });
  }
  return { findings, summary };
}

async function ensureAuditSchema(client) {
  await client.query(`
    ALTER TABLE contract_audits
      ADD COLUMN IF NOT EXISTS low_count INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS informational_count INTEGER NOT NULL DEFAULT 0
  `);
  await client.query(`
    ALTER TABLE contract_audit_findings
      ADD COLUMN IF NOT EXISTS original_severity TEXT,
      ADD COLUMN IF NOT EXISTS evidence_tag TEXT,
      ADD COLUMN IF NOT EXISTS evidence_tags TEXT[] DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS verification_status TEXT,
      ADD COLUMN IF NOT EXISTS report_id TEXT,
      ADD COLUMN IF NOT EXISTS source_finding_id TEXT,
      ADD COLUMN IF NOT EXISTS trust_adjustment TEXT
  `);
  await client.query(`
    DO $$
    DECLARE c record;
    BEGIN
      FOR c IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'contract_audit_findings'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) ILIKE '%severity%'
      LOOP
        EXECUTE format('ALTER TABLE contract_audit_findings DROP CONSTRAINT %I', c.conname);
      END LOOP;
      ALTER TABLE contract_audit_findings
        ADD CONSTRAINT contract_audit_findings_severity_check
        CHECK (severity IN ('critical','high','medium','low','informational'));
    END $$;
  `);
}

async function upsertAudit(client, args, parsed, rawReport) {
  const now = Date.now();
  const counts = parsed.findings.reduce((acc, f) => {
    if (f.severity && acc[f.severity] != null) acc[f.severity]++;
    return acc;
  }, { critical: 0, high: 0, medium: 0, low: 0, informational: 0 });

  const startedAt = args.startedAt || now;
  const durationMs = now - startedAt;

  const upsert = await client.query(
    `INSERT INTO contract_audits (
        address, network, audit_tool, audit_mode, tool_version,
        status, started_at, completed_at, duration_ms,
        raw_report, report_path,
        critical_count, high_count, medium_count, low_count, informational_count
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
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
        low_count = EXCLUDED.low_count,
        informational_count = EXCLUDED.informational_count,
        error_message = NULL
     RETURNING id`,
    [
      args.address, args.network, args.tool, args.mode, args.toolVersion,
      args.status, startedAt, now, durationMs,
      rawReport, args.report,
      counts.critical, counts.high, counts.medium, counts.low, counts.informational
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
          recommendation, proof_of_concept, finding_index, created_at,
          original_severity, evidence_tag, evidence_tags, verification_status,
          report_id, source_finding_id, trust_adjustment
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
      [
        auditId, f.severity, f.title,
        [f.description, f.impact && `\n\n**Impact**\n\n${f.impact}`].filter(Boolean).join(''),
        f.location, f.recommendation, f.proofOfConcept,
        f.idIndex, now,
        f.originalSeverity, f.evidenceTag, f.evidenceTags || [],
        f.verificationStatus, f.reportId, f.sourceFindingId, f.trustAdjustment
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
  const parsed = parseReport(rawReport, {
    indexText: loadReportIndexText(args.report),
    supportingEvidence: loadSupportingEvidence(args.report)
  });

  const pool = new Pool({ connectionString: loadDatabaseUrl() });
  const client = await pool.connect();
  try {
    await ensureAuditSchema(client);
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

module.exports = {
  parseReport,
  parseSummaryCounts,
  splitFindingSections,
  parseHeader,
  extractField,
  parseReportIndexEntries,
  parseReportIndexTitles,
  parseSupportingEvidenceSections,
  loadSupportingEvidence,
  extractEvidenceTags
};
