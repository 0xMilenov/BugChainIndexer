"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  cancelContractAudit,
  getContractAudit,
  getContractAuditStatus,
  triggerContractAudit,
  type AuditFinding,
  type ContractAudit,
  type ContractAuditStatus,
} from "@/lib/api";
import { AuditMarkdown } from "./AuditMarkdown";
import { SeverityBadges } from "./SeverityBadges";
import { Loader2, Play, AlertTriangle, RefreshCcw, Activity, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface AuditSectionProps {
  address: string;
  network: string;
}

const SEVERITY_STYLE: Record<AuditFinding["severity"], string> = {
  critical: "bg-sev-crit/15 text-sev-crit-text border-sev-crit/40",
  high: "bg-sev-high/15 text-sev-high border-sev-high/40",
  medium: "bg-sev-med/15 text-sev-med border-sev-med/40",
  low: "bg-sev-low/15 text-sev-low-text border-sev-low/40",
  informational: "bg-ink-3 text-faint border-rule-strong",
};

/** DB / JSON may return millis as number, string, or seconds (10-digit). */
function formatTimestamp(raw?: number | string | null): string {
  if (raw === null || raw === undefined || raw === "") return "";
  const n = typeof raw === "string" ? Number(raw.trim()) : Number(raw);
  if (!Number.isFinite(n) || n <= 0) return "";
  const asMs = n < 1e12 ? n * 1000 : n;
  const d = new Date(asMs);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString();
}

function formatDuration(ms?: number | string | null): string {
  if (ms === null || ms === undefined || ms === "") return "";
  const n = typeof ms === "string" ? Number(ms.trim()) : Number(ms);
  if (!Number.isFinite(n) || n <= 0) return "";
  const sec = Math.round(n / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  const remMin = min % 60;
  return remMin > 0 ? `${hr}h ${remMin}m` : `${hr}h`;
}

function labelize(value?: string | null): string {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function uniqueEvidenceTags(finding: AuditFinding): string[] {
  const tags = [
    ...(Array.isArray(finding.evidence_tags) ? finding.evidence_tags : []),
    finding.evidence_tag,
  ]
    .filter(Boolean)
    .map((tag) => String(tag));
  return [...new Set(tags)];
}

function FindingCard({ finding, index }: { finding: AuditFinding; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = Boolean(
    finding.description || finding.recommendation || finding.proof_of_concept || finding.location
  );
  const originalSeverity = finding.original_severity || finding.severity;
  const isDemoted = Boolean(originalSeverity && originalSeverity !== finding.severity);
  const evidenceTags = uniqueEvidenceTags(finding);

  return (
    <div className="rounded-lg border border-rule bg-ink-2/40">
      <button
        type="button"
        onClick={() => hasDetails && setExpanded((v) => !v)}
        className="flex w-full items-start gap-3 px-4 py-3 text-left"
      >
        <span
          className={`mt-0.5 inline-flex flex-shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${SEVERITY_STYLE[finding.severity]}`}
        >
          {finding.severity}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-body">
            <span className="text-faint mr-2">#{index + 1}</span>
            {finding.title}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {finding.report_id && (
              <span className="inline-flex rounded border border-rule bg-ink-0 px-1.5 py-0.5 font-data text-[10px] text-faint">
                {finding.report_id}
              </span>
            )}
            {finding.source_finding_id && (
              <span className="inline-flex rounded border border-rule bg-ink-0 px-1.5 py-0.5 font-data text-[10px] text-faint">
                {finding.source_finding_id}
              </span>
            )}
            {finding.verification_status && (
              <span className="inline-flex rounded border border-rule bg-ink-0 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-faint">
                {finding.verification_status}
              </span>
            )}
            {isDemoted && (
              <span className="inline-flex rounded border border-sev-high/30 bg-sev-high/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-sev-high">
                Demoted from {labelize(originalSeverity)}
              </span>
            )}
            {evidenceTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex rounded border border-signal/30 bg-signal/10 px-1.5 py-0.5 font-data text-[10px] font-semibold text-signal"
              >
                {tag}
              </span>
            ))}
          </div>
          {finding.location && (
            <div className="mt-1 font-data text-[11px] text-faint truncate">
              {finding.location}
            </div>
          )}
        </div>
        {hasDetails && (
          <span className="flex-shrink-0 text-faint text-xs select-none">
            {expanded ? "▾" : "▸"}
          </span>
        )}
      </button>

      {expanded && hasDetails && (
        <div className="border-t border-rule px-4 py-3 space-y-3 text-sm">
          {finding.description && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-faint mb-1">
                Description
              </div>
              <AuditMarkdown content={finding.description} />
            </div>
          )}
          {finding.proof_of_concept && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-faint mb-1">
                Proof of Concept
              </div>
              <AuditMarkdown content={finding.proof_of_concept} />
            </div>
          )}
          {finding.recommendation && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-faint mb-1">
                Recommendation
              </div>
              <AuditMarkdown content={finding.recommendation} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const STATUS_STYLE: Record<string, string> = {
  running: "bg-blue-600/15 text-blue-text border-blue-600/40",
  pending: "bg-blue-600/15 text-blue-text border-blue-600/40",
  completed: "bg-signal/15 text-signal border-signal/40",
  failed: "bg-sev-crit/15 text-sev-crit-text border-sev-crit/40",
  stalled: "bg-sev-high/15 text-sev-high border-sev-high/40",
  cancelled: "bg-ink-3 text-faint border-rule-strong",
};

function StatusPill({ status }: { status: string }) {
  const cls = STATUS_STYLE[status] || "bg-ink-2 text-faint border-rule";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cls}`}
    >
      {status === "running" || status === "pending" ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : null}
      {status}
    </span>
  );
}

export function AuditSection({ address, network }: AuditSectionProps) {
  const { user, loginUrl } = useAuth();
  /** Status row from contract_audits (lightweight, polled). */
  const [status, setStatus] = useState<ContractAuditStatus | null>(null);
  /** Full audit including findings — fetched only when status is 'completed'. */
  const [audit, setAudit] = useState<ContractAudit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [triggering, setTriggering] = useState(false);
  const [triggerError, setTriggerError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelled = useRef(false);

  const loadFindings = useCallback(async () => {
    try {
      const r = await getContractAudit(address, network);
      if (cancelled.current) return;
      setAudit(r?.audit ?? null);
    } catch (err) {
      if (cancelled.current) return;
      setError((err as Error)?.message || "Failed to load audit");
    }
  }, [address, network]);

  const refreshStatus = useCallback(async () => {
    try {
      const r = await getContractAuditStatus(address, network);
      if (cancelled.current) return;
      const next = r.audit ?? null;
      setStatus(next);
      setError(null);
      if (next?.status === "completed") {
        // Lazy-load findings only once the run finishes.
        await loadFindings();
      }
      return next;
    } catch (err) {
      if (cancelled.current) return null;
      setError((err as Error)?.message || "Failed to load audit status");
      return null;
    }
  }, [address, network, loadFindings]);

  // Initial load + auto-poll while running.
  useEffect(() => {
    cancelled.current = false;
    setLoading(true);
    setError(null);
    setAudit(null);
    setStatus(null);

    (async () => {
      const next = await refreshStatus();
      if (cancelled.current) return;
      setLoading(false);
      schedulePoll(next?.status);
    })();

    function schedulePoll(s?: string) {
      if (pollTimer.current) clearTimeout(pollTimer.current);
      if (s === "running" || s === "pending") {
        pollTimer.current = setTimeout(async () => {
          const next = await refreshStatus();
          if (!cancelled.current) schedulePoll(next?.status);
        }, 5000);
      }
    }

    return () => {
      cancelled.current = true;
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, [refreshStatus]);

  const handleRun = useCallback(async () => {
    if (!user) {
      setTriggerError("Login required");
      return;
    }
    setTriggering(true);
    setTriggerError(null);
    try {
      const r = await triggerContractAudit(address, network, "thorough");
      if (r.audit) setStatus(r.audit);
      // Kick the poll loop immediately.
      const next = await refreshStatus();
      if (next?.status === "running" || next?.status === "pending") {
        if (pollTimer.current) clearTimeout(pollTimer.current);
        pollTimer.current = setTimeout(async function tick() {
          const s = await refreshStatus();
          if (cancelled.current) return;
          if (s?.status === "running" || s?.status === "pending") {
            pollTimer.current = setTimeout(tick, 5000);
          }
        }, 5000);
      }
    } catch (err) {
      setTriggerError((err as Error)?.message || "Failed to start audit");
    } finally {
      setTriggering(false);
    }
  }, [address, network, refreshStatus, user]);

  const handleCancel = useCallback(async () => {
    if (!user) {
      setCancelError("Login required");
      return;
    }
    if (!window.confirm("Stop the in-flight audit? Any progress will be lost.")) return;
    setCancelling(true);
    setCancelError(null);
    try {
      const r = await cancelContractAudit(address, network);
      if (r.audit) setStatus(r.audit);
      // Stop the polling loop — status is now terminal.
      if (pollTimer.current) {
        clearTimeout(pollTimer.current);
        pollTimer.current = null;
      }
    } catch (err) {
      setCancelError((err as Error)?.message || "Failed to cancel audit");
    } finally {
      setCancelling(false);
    }
  }, [address, network, user]);

  const isRunning = status?.status === "running" || status?.status === "pending";
  const isCompleted = status?.status === "completed";
  const isTerminalFailure =
    status?.status === "failed" ||
    status?.status === "stalled" ||
    status?.status === "cancelled";
  const showFindings = isCompleted && audit;

  return (
    <div className="border border-rule bg-ink-1 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-b border-rule bg-ink-2">
        <div className="flex items-center gap-3">
          <h2 className="font-data text-[12px] uppercase tracking-[0.12em] text-faint">
            Security audit
          </h2>
          {status && <StatusPill status={status.status} />}
        </div>
        <div className="flex items-center gap-3">
          {isCompleted && audit && (
            <SeverityBadges
              critical={audit.critical_count}
              high={audit.high_count}
              medium={audit.medium_count}
              low={audit.low_count}
              informational={audit.informational_count}
            />
          )}
          {isCompleted && status?.completed_at && (
            <span className="text-[11px] text-faint">
              {formatTimestamp(status.completed_at)}
            </span>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {loading && <div className="text-sm text-faint">Loading audit…</div>}

        {!loading && error && (
          <div className="text-sm text-sev-crit-text">Error: {error}</div>
        )}

        {/* No audit ever started for this contract */}
        {!loading && !error && !status && (
          <div className="rounded-lg border border-dashed border-rule bg-ink-2/40 p-6 text-center">
            <div className="mx-auto mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-600/10 text-blue-text">
              <Play className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-semibold text-body">
              This contract hasn&apos;t been audited yet.
            </h3>
            <p className="mx-auto mt-1 max-w-md text-xs text-faint">
              Run an AAA audit to surface findings and their evidence trail. The
              run takes ~1–5 hours depending on contract size.
            </p>
            {user ? (
              <button
                type="button"
                onClick={handleRun}
                disabled={triggering}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-paper transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {triggering ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Starting…
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Run audit
                  </>
                )}
              </button>
            ) : (
              <Link
                href={loginUrl}
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-blue-600/40 bg-blue-600/10 px-5 py-2 text-sm font-semibold text-blue-text transition hover:bg-blue-600/20"
              >
                Log in
              </Link>
            )}
            {triggerError && (
              <p className="mt-3 text-xs text-sev-crit-text">{triggerError}</p>
            )}
          </div>
        )}

        {/* In-flight audit */}
        {!loading && !error && isRunning && (
          <div className="rounded-lg border border-blue-600/30 bg-blue-600/5 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-blue-text">
              <Activity className="h-4 w-4 animate-pulse" />
              AAA audit in progress
            </div>
            <div className="mt-2 grid grid-cols-1 gap-2 text-xs text-faint sm:grid-cols-3">
              <div>
                <span className="uppercase tracking-wider">Mode</span>
                <div className="font-data text-body">
                  {status?.audit_mode || "—"}
                </div>
              </div>
              <div>
                <span className="uppercase tracking-wider">Phase</span>
                <div className="font-data text-body">
                  {status?.phase || "starting…"}
                </div>
              </div>
              <div>
                <span className="uppercase tracking-wider">Started</span>
                <div className="font-data text-body">
                  {formatTimestamp(status?.started_at) || "—"}
                </div>
              </div>
            </div>
            {status?.log_tail && (
              <details className="mt-3 group">
                <summary className="cursor-pointer text-[11px] uppercase tracking-wider text-faint hover:text-body">
                  Live log tail
                </summary>
                <pre className="mt-2 max-h-48 overflow-auto rounded-md border border-rule bg-ink-0 p-3 font-data text-[11px] leading-relaxed text-faint">
                  {status.log_tail}
                </pre>
              </details>
            )}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] text-faint">
                The page polls every 5s. You can leave and come back — findings
                will appear here once the run finishes.
              </p>
              {user ? (
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="inline-flex items-center gap-1.5 rounded-full border border-sev-crit/40 bg-sev-crit/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-sev-crit-text transition hover:bg-sev-crit/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {cancelling ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Stopping…
                    </>
                  ) : (
                    <>
                      <X className="h-3 w-3" />
                      Stop audit
                    </>
                  )}
                </button>
              ) : (
                <Link
                  href={loginUrl}
                  className="inline-flex items-center gap-1.5 rounded-full border border-rule bg-ink-2 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-faint transition hover:border-blue-600/40 hover:text-blue-text"
                >
                  Log in
                </Link>
              )}
            </div>
            {cancelError && (
              <p className="mt-2 text-[11px] text-sev-crit-text">{cancelError}</p>
            )}
          </div>
        )}

        {/* Failure / stall / cancelled */}
        {!loading && !error && isTerminalFailure && (
          <div
            className={
              status?.status === "cancelled"
                ? "rounded-lg border border-rule bg-ink-2/40 p-4"
                : "rounded-lg border border-sev-crit/30 bg-sev-crit/5 p-4"
            }
          >
            <div
              className={
                status?.status === "cancelled"
                  ? "flex items-center gap-2 text-sm font-semibold text-faint"
                  : "flex items-center gap-2 text-sm font-semibold text-sev-crit-text"
              }
            >
              {status?.status === "cancelled" ? (
                <X className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              {status?.status === "cancelled"
                ? "Audit cancelled"
                : status?.status === "stalled"
                  ? "Audit stalled"
                  : "Audit failed"}
            </div>
            {status?.error_message && (
              <p className="mt-1 text-xs text-faint">{status.error_message}</p>
            )}
            {user ? (
              <button
                type="button"
                onClick={handleRun}
                disabled={triggering}
                className="mt-3 inline-flex items-center gap-2 rounded-full border border-rule bg-ink-2 px-4 py-1.5 text-xs font-semibold text-body transition hover:border-blue-600/40 hover:bg-blue-600/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {triggering ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCcw className="h-3 w-3" />
                )}
                {status?.status === "cancelled" ? "Run audit again" : "Retry audit"}
              </button>
            ) : (
              <Link
                href={loginUrl}
                className="mt-3 inline-flex items-center gap-2 rounded-full border border-rule bg-ink-2 px-4 py-1.5 text-xs font-semibold text-body transition hover:border-blue-600/40 hover:bg-blue-600/10"
              >
                Log in
              </Link>
            )}
            {triggerError && (
              <p className="mt-2 text-xs text-sev-crit-text">{triggerError}</p>
            )}
          </div>
        )}

        {/* Completed: render findings */}
        {!loading && !error && showFindings && audit.findings.length === 0 && (
          <div className="text-sm text-signal">
            Audit completed - no persisted findings.
          </div>
        )}
        {!loading && !error && showFindings && audit.findings.length > 0 && (
          <div className="space-y-2">
            {audit.findings.map((f, i) => (
              <FindingCard key={f.id} finding={f} index={i} />
            ))}
          </div>
        )}

        {/* Completed but findings still loading */}
        {!loading && !error && isCompleted && !audit && (
          <div className="text-sm text-faint">Loading findings…</div>
        )}
      </div>

      {(audit || status) && (
        <div className="border-t border-rule bg-ink-2/40 px-4 py-2 text-[11px] text-faint flex flex-wrap gap-3">
          <span>
            Tool:{" "}
            <span className="font-data text-body">
              {audit?.audit_tool || status?.audit_tool || "plamen"}
            </span>
          </span>
          {(audit?.audit_mode || status?.audit_mode) && (
            <span>
              Mode:{" "}
              <span className="font-data text-body">
                {audit?.audit_mode || status?.audit_mode}
              </span>
            </span>
          )}
          {isCompleted && audit?.duration_ms && (
            <span>
              Duration:{" "}
              <span className="font-data text-body">
                {formatDuration(audit.duration_ms)}
              </span>
            </span>
          )}
          <span>
            Critical through informational findings are persisted with provenance.
          </span>
        </div>
      )}
    </div>
  );
}
