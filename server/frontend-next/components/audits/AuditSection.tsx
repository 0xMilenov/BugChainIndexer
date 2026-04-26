"use client";

import { useEffect, useState } from "react";
import { getContractAudit, type ContractAudit, type AuditFinding } from "@/lib/api";
import { AuditMarkdown } from "./AuditMarkdown";
import { SeverityBadges } from "./SeverityBadges";

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

export function AuditSection({ address, network }: AuditSectionProps) {
  const [audit, setAudit] = useState<ContractAudit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getContractAudit(address, network)
      .then((r) => {
        if (cancelled) return;
        setAudit(r?.audit ?? null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message || "Failed to load audit");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [address, network]);

  return (
    <div className="rounded-xl border border-border bg-bg-secondary overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border bg-bg-tertiary">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted">
          Security Audit
        </h2>
        {audit && (
          <div className="flex items-center gap-3">
            <SeverityBadges
              critical={audit.critical_count}
              high={audit.high_count}
              medium={audit.medium_count}
            />
            {audit.completed_at && (
              <span className="text-[11px] text-text-muted">
                {formatTimestamp(audit.completed_at)}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="p-4">
        {loading && <div className="text-sm text-text-muted">Loading audit…</div>}
        {!loading && error && (
          <div className="text-sm text-red-400">Error: {error}</div>
        )}
        {!loading && !error && !audit && (
          <div className="text-sm text-text-muted">
            No audit has been run for this contract yet.
          </div>
        )}
        {!loading && !error && audit && audit.findings.length === 0 && (
          <div className="text-sm text-emerald-400">
            Audit completed — no critical / high / medium findings.
          </div>
        )}
        {!loading && !error && audit && audit.findings.length > 0 && (
          <div className="space-y-2">
            {audit.findings.map((f, i) => (
              <FindingCard key={f.id} finding={f} index={i} />
            ))}
          </div>
        )}
      </div>

      {audit && (
        <div className="border-t border-border bg-bg-tertiary/40 px-4 py-2 text-[11px] text-text-muted flex flex-wrap gap-3">
          <span>
            Tool: <span className="font-mono text-text-primary">{audit.audit_tool}</span>
          </span>
          {audit.audit_mode && (
            <span>
              Mode: <span className="font-mono text-text-primary">{audit.audit_mode}</span>
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
