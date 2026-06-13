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
  critical: "bg-red-500/15 text-red-400 border-red-500/40",
  high: "bg-orange-500/15 text-orange-400 border-orange-500/40",
  medium: "bg-amber-500/15 text-amber-400 border-amber-500/40",
  low: "bg-sky-500/15 text-sky-400 border-sky-500/40",
  informational: "bg-zinc-500/15 text-zinc-400 border-zinc-500/40",
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
    <div className="rounded-lg border border-border bg-bg-tertiary/40">
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
          <div className="text-sm font-medium text-text-primary">
            <span className="text-text-muted mr-2">#{index + 1}</span>
            {finding.title}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {finding.report_id && (
              <span className="inline-flex rounded border border-border bg-bg-primary px-1.5 py-0.5 font-mono text-[10px] text-text-muted">
                {finding.report_id}
              </span>
            )}
            {finding.source_finding_id && (
              <span className="inline-flex rounded border border-border bg-bg-primary px-1.5 py-0.5 font-mono text-[10px] text-text-muted">
                {finding.source_finding_id}
              </span>
            )}
            {finding.verification_status && (
              <span className="inline-flex rounded border border-border bg-bg-primary px-1.5 py-0.5 text-[10px] font-semibold uppercase text-text-muted">
                {finding.verification_status}
              </span>
            )}
            {isDemoted && (
              <span className="inline-flex rounded border border-orange-500/30 bg-orange-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-orange-300">
                Demoted from {labelize(originalSeverity)}
              </span>
            )}
            {evidenceTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-emerald-300"
              >
                {tag}
              </span>
            ))}
          </div>
          {finding.location && (
            <div className="mt-1 font-mono text-[11px] text-text-muted truncate">
              {finding.location}
            </div>
          )}
        </div>
        {hasDetails && (
          <span className="flex-shrink-0 text-text-muted text-xs select-none">
            {expanded ? "▾" : "▸"}
          </span>
        )}
      </button>

      {expanded && hasDetails && (
        <div className="border-t border-border px-4 py-3 space-y-3 text-sm">
          {finding.description && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-1">
                Description
              </div>
              <AuditMarkdown content={finding.description} />
            </div>
          )}
          {finding.proof_of_concept && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-1">
                Proof of Concept
              </div>
              <AuditMarkdown content={finding.proof_of_concept} />
            </div>
          )}
          {finding.recommendation && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-1">
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
  running: "bg-accent/15 text-accent border-accent/40",
  pending: "bg-accent/15 text-accent border-accent/40",
  completed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/40",
  failed: "bg-red-500/15 text-red-400 border-red-500/40",
  stalled: "bg-amber-500/15 text-amber-400 border-amber-500/40",
  cancelled: "bg-text-muted/15 text-text-muted border-border",
};

function StatusPill({ status }: { status: string }) {
  const cls = STATUS_STYLE[status] || "bg-bg-tertiary text-text-muted border-border";
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
    <div className="rounded-xl border border-border bg-bg-secondary overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-border bg-bg-tertiary">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted">
            Security Audit
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
            <span className="text-[11px] text-text-muted">
              {formatTimestamp(status.completed_at)}
            </span>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {loading && <div className="text-sm text-text-muted">Loading audit…</div>}

        {!loading && error && (
          <div className="text-sm text-red-400">Error: {error}</div>
        )}

        {/* No audit ever started for this contract */}
        {!loading && !error && !status && (
          <div className="rounded-lg border border-dashed border-border bg-bg-tertiary/40 p-6 text-center">
            <div className="mx-auto mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-accent">
              <Play className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-semibold text-text-primary">
              This contract hasn&apos;t been audited yet.
            </h3>
            <p className="mx-auto mt-1 max-w-md text-xs text-text-muted">
              Run a Plamen audit to surface findings and their evidence trail. The
              run takes ~1–5 hours depending on contract size.
            </p>
            {user ? (
              <button
                type="button"
                onClick={handleRun}
                disabled={triggering}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-bg-primary transition hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-60"
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
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-5 py-2 text-sm font-semibold text-accent transition hover:bg-accent/20"
              >
                Log in
              </Link>
            )}
            {triggerError && (
              <p className="mt-3 text-xs text-red-400">{triggerError}</p>
            )}
          </div>
        )}

        {/* In-flight audit */}
        {!loading && !error && isRunning && (
          <div className="rounded-lg border border-accent/30 bg-accent/5 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-accent">
              <Activity className="h-4 w-4 animate-pulse" />
              Plamen audit in progress
            </div>
            <div className="mt-2 grid grid-cols-1 gap-2 text-xs text-text-muted sm:grid-cols-3">
              <div>
                <span className="uppercase tracking-wider">Mode</span>
                <div className="font-mono text-text-primary">
                  {status?.audit_mode || "—"}
                </div>
              </div>
              <div>
                <span className="uppercase tracking-wider">Phase</span>
                <div className="font-mono text-text-primary">
                  {status?.phase || "starting…"}
                </div>
              </div>
              <div>
                <span className="uppercase tracking-wider">Started</span>
                <div className="font-mono text-text-primary">
                  {formatTimestamp(status?.started_at) || "—"}
                </div>
              </div>
            </div>
            {status?.log_tail && (
              <details className="mt-3 group">
                <summary className="cursor-pointer text-[11px] uppercase tracking-wider text-text-muted hover:text-text-primary">
                  Live log tail
                </summary>
                <pre className="mt-2 max-h-48 overflow-auto rounded-md border border-border bg-bg-primary p-3 font-mono text-[11px] leading-relaxed text-text-muted">
                  {status.log_tail}
                </pre>
              </details>
            )}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] text-text-muted">
                The page polls every 5s. You can leave and come back — findings
                will appear here once the run finishes.
              </p>
              {user ? (
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="inline-flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-red-400 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
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
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-bg-tertiary px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-text-muted transition hover:border-accent/40 hover:text-accent"
                >
                  Log in
                </Link>
              )}
            </div>
            {cancelError && (
              <p className="mt-2 text-[11px] text-red-400">{cancelError}</p>
            )}
          </div>
        )}

        {/* Failure / stall / cancelled */}
        {!loading && !error && isTerminalFailure && (
          <div
            className={
              status?.status === "cancelled"
                ? "rounded-lg border border-border bg-bg-tertiary/40 p-4"
                : "rounded-lg border border-red-500/30 bg-red-500/5 p-4"
            }
          >
            <div
              className={
                status?.status === "cancelled"
                  ? "flex items-center gap-2 text-sm font-semibold text-text-muted"
                  : "flex items-center gap-2 text-sm font-semibold text-red-400"
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
              <p className="mt-1 text-xs text-text-muted">{status.error_message}</p>
            )}
            {user ? (
              <button
                type="button"
                onClick={handleRun}
                disabled={triggering}
                className="mt-3 inline-flex items-center gap-2 rounded-full border border-border bg-bg-tertiary px-4 py-1.5 text-xs font-semibold text-text-primary transition hover:border-accent/40 hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-60"
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
                className="mt-3 inline-flex items-center gap-2 rounded-full border border-border bg-bg-tertiary px-4 py-1.5 text-xs font-semibold text-text-primary transition hover:border-accent/40 hover:bg-accent/10"
              >
                Log in
              </Link>
            )}
            {triggerError && (
              <p className="mt-2 text-xs text-red-400">{triggerError}</p>
            )}
          </div>
        )}

        {/* Completed: render findings */}
        {!loading && !error && showFindings && audit.findings.length === 0 && (
          <div className="text-sm text-emerald-400">
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
          <div className="text-sm text-text-muted">Loading findings…</div>
        )}
      </div>

      {(audit || status) && (
        <div className="border-t border-border bg-bg-tertiary/40 px-4 py-2 text-[11px] text-text-muted flex flex-wrap gap-3">
          <span>
            Tool:{" "}
            <span className="font-mono text-text-primary">
              {audit?.audit_tool || status?.audit_tool || "plamen"}
            </span>
          </span>
          {(audit?.audit_mode || status?.audit_mode) && (
            <span>
              Mode:{" "}
              <span className="font-mono text-text-primary">
                {audit?.audit_mode || status?.audit_mode}
              </span>
            </span>
          )}
          {isCompleted && audit?.duration_ms && (
            <span>
              Duration:{" "}
              <span className="font-mono text-text-primary">
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
