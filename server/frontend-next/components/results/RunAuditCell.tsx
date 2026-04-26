"use client";

import { useState } from "react";
import { Loader2, Play, AlertTriangle, RefreshCcw, Activity } from "lucide-react";
import { triggerContractAudit } from "@/lib/api";
import type { Contract } from "@/types/contract";
import { getRowAuditState, type RowAuditState } from "@/lib/contract-utils";

/**
 * Inline audit-action cell for the dashboard.
 *
 * Three relevant states (severity-counts state is rendered by the existing
 * cells, not here):
 *
 *  - 'none'     -> "Run audit" button. Click triggers a Plamen run; we then
 *                  flip the local state to 'running' optimistically. The user
 *                  can navigate to the contract page for live progress.
 *  - 'running' / 'pending'  -> animated "Running" badge with phase if known.
 *  - 'failed' / 'stalled'   -> "Retry" button. Same trigger path as 'none'.
 *
 * `compact` mode renders a tighter button suitable for table cells; the card
 * variant uses the default sizing.
 */
export function RunAuditCell({
  contract,
  compact = false,
}: {
  contract: Contract;
  compact?: boolean;
}) {
  /** Local override so the row visibly transitions after click without a refetch. */
  const [localState, setLocalState] = useState<RowAuditState | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const state: RowAuditState = localState ?? getRowAuditState(contract);

  async function run(e: React.MouseEvent) {
    // Stop the click from bubbling to the row's <Link> wrapper.
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    setErr(null);
    try {
      await triggerContractAudit(contract.address, contract.network ?? "", "thorough");
      setLocalState("running");
    } catch (caught) {
      setErr((caught as Error)?.message || "Failed to start audit");
    } finally {
      setBusy(false);
    }
  }

  if (state === "running" || state === "pending") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 ${
          compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]"
        } font-semibold uppercase tracking-wider text-accent`}
        title={
          contract.audit_phase
            ? `Plamen run in progress · ${contract.audit_phase}`
            : "Plamen run in progress"
        }
      >
        <Activity className={compact ? "h-3 w-3 animate-pulse" : "h-3.5 w-3.5 animate-pulse"} />
        {contract.audit_phase ? contract.audit_phase : "Running"}
      </span>
    );
  }

  const isRetry = state === "failed" || state === "stalled";

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className={`inline-flex items-center gap-1.5 rounded-full border font-semibold uppercase tracking-wider transition disabled:cursor-not-allowed disabled:opacity-60 ${
          compact ? "px-2.5 py-0.5 text-[10px]" : "px-3 py-1 text-[11px]"
        } ${
          isRetry
            ? "border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20"
            : "border-accent/40 bg-accent/10 text-accent hover:bg-accent/20"
        }`}
        title={
          isRetry
            ? "Previous audit run did not finish — click to retry"
            : "Run a Plamen audit on this contract"
        }
      >
        {busy ? (
          <Loader2 className={compact ? "h-3 w-3 animate-spin" : "h-3.5 w-3.5 animate-spin"} />
        ) : isRetry ? (
          <RefreshCcw className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
        ) : (
          <Play className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
        )}
        {busy ? "Starting" : isRetry ? "Retry" : "Run audit"}
      </button>
      {err && (
        <span
          className="inline-flex items-center gap-1 text-[10px] text-red-400"
          title={err}
        >
          <AlertTriangle className="h-3 w-3" />
          Failed to start
        </span>
      )}
    </span>
  );
}
