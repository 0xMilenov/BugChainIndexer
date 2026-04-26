"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getContractAudit,
  getContractAuditStatus,
  triggerContractAudit,
  type AuditFinding,
  type ContractAudit,
  type ContractAuditStatus,
} from "@/lib/api";
import { AuditMarkdown } from "./AuditMarkdown";
import { SeverityBadges } from "./SeverityBadges";
import { Loader2, Play, AlertTriangle, RefreshCcw, Activity } from "lucide-react";

interface AuditSectionProps {
  address: string;
  network: string;
}

const SEVERITY_STYLE: Record<AuditFinding["severity"], string> = {
  critical: "bg-red-500/15 text-red-400 border-red-500/40",
  high: "bg-orange-500/15 text-orange-400 border-orange-500/40",
  medium: "bg-amber-500/15 text-amber-400 border-amber-500/40",
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

function FindingCard({ finding, index }: { finding: AuditFinding; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = Boolean(
    finding.description || finding.recommendation || finding.proof_of_concept || finding.location
  );

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
  /** Status row from contract_audits (lightweight, polled). */
  const [status, setStatus] = useState<ContractAuditStatus | null>(null);
  /** Full audit including findings — fetched only when status is 'completed'. */
  const [audit, setAudit] = useState<ContractAudit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [triggering, setTriggering] = useState(false);
  const [triggerError, setTriggerError] = useState<string | null>(null);
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
  }, [address, network, refreshStatus]);

  const isRunning = status?.status === "running" || status?.status === "pending";
  const isCompleted = status?.status === "completed";
  const isTerminalFailure = status?.status === "failed" || status?.status === "stalled";
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
              Run a Plamen audit to surface critical / high / medium findings. The
              run takes ~1–5 hours depending on contract size.
            </p>
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
            <p className="mt-3 text-[11px] text-text-muted">
              The page polls every 5s. You can leave and come back — findings will
              appear here once the run finishes.
            </p>
          </div>
        )}

        {/* Failure / stall */}
        {!loading && !error && isTerminalFailure && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-red-400">
              <AlertTriangle className="h-4 w-4" />
              {status?.status === "stalled" ? "Audit stalled" : "Audit failed"}
            </div>
            {status?.error_message && (
              <p className="mt-1 text-xs text-text-muted">{status.error_message}</p>
            )}
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
              Retry audit
            </button>
            {triggerError && (
              <p className="mt-2 text-xs text-red-400">{triggerError}</p>
            )}
          </div>
        )}

        {/* Completed: render findings */}
        {!loading && !error && showFindings && audit.findings.length === 0 && (
          <div className="text-sm text-emerald-400">
            Audit completed — no critical / high / medium findings.
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
            Only <b>critical / high / medium</b> findings are persisted.
          </span>
        </div>
      )}
    </div>
  );
}
