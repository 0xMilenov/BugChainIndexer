"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatDateTime, formatElapsed } from "@/lib/time";
import { useNow } from "@/hooks/useNow";
import type { AuditReport } from "@/lib/api";

export interface EvmbenchJob {
  status?: string;
  model?: string;
  file_name?: string;
  created_at?: string;
  started_at?: string;
  queue_position?: number;
}

export interface AuditProgressModalProps {
  open: boolean;
  onClose: () => void;
  auditReport: AuditReport | null;
  evmbenchJob?: EvmbenchJob | null;
  contractFileName?: string;
}

function isActiveStatus(status: string | undefined): boolean {
  return status === "running" || status === "queued";
}

export function AuditProgressModal({
  open,
  onClose,
  auditReport,
  evmbenchJob,
  contractFileName,
}: AuditProgressModalProps) {
  const now = useNow(1000);

  const startTimestamp = useMemo(() => {
    const value = evmbenchJob?.started_at ?? evmbenchJob?.created_at ?? auditReport?.triggered_at;
    return value ? new Date(value).getTime() : null;
  }, [evmbenchJob?.started_at, evmbenchJob?.created_at, auditReport?.triggered_at]);

  const endTimestamp = useMemo(() => {
    const isDone = auditReport?.status === "completed" || auditReport?.status === "failed";
    if (isDone && auditReport?.completed_at) {
      return new Date(auditReport.completed_at).getTime();
    }
    return now;
  }, [auditReport?.status, auditReport?.completed_at, now]);

  const elapsedLabel = startTimestamp
    ? formatElapsed(Math.max(0, endTimestamp - startTimestamp))
    : "--:--";

  const status = evmbenchJob?.status ?? auditReport?.status ?? "queued";
  const statusLabel =
    status === "queued"
      ? "Queued"
      : status === "running"
        ? "RUNNING"
        : status === "succeeded"
          ? "Completed"
          : status === "failed"
            ? "Failed"
            : status;
  const isActive = isActiveStatus(status);
  const isDone = auditReport?.status === "completed" || auditReport?.status === "failed";

  const model = evmbenchJob?.model ?? auditReport?.model ?? "—";
  const fileName = evmbenchJob?.file_name ?? contractFileName ?? "contract.zip";

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={isDone ? onClose : undefined}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-md rounded-xl border border-border bg-bg-secondary p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-text-primary mb-1">
          Running analysis
        </h2>
        <p className="text-sm text-text-muted mb-4">
          We are analyzing the uploaded repository. Results will appear as soon
          as the run completes.
        </p>

        <div className="grid grid-cols-[90px_1fr] gap-y-1.5 text-xs mb-4">
          <span className="text-text-muted">Status</span>
          <div className="flex items-center gap-2 text-text-primary">
            <Badge
              variant={
                isDone && auditReport?.status === "completed"
                  ? "success"
                  : isDone && auditReport?.status === "failed"
                    ? "warning"
                    : "muted"
              }
            >
              {isActive && (
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-current mr-1.5 animate-pulse" />
              )}
              {statusLabel}
            </Badge>
          </div>
          {evmbenchJob?.queue_position != null && (
            <>
              <span className="text-text-muted">Queue position</span>
              <span className="text-text-primary tabular-nums">
                {evmbenchJob.queue_position}
              </span>
            </>
          )}
          <span className="text-text-muted">Elapsed</span>
          <span className="text-text-primary tabular-nums">{elapsedLabel}</span>
          <span className="text-text-muted">Model</span>
          <span className="text-text-primary">{model}</span>
          <span className="text-text-muted">File</span>
          <span className="text-text-primary truncate">{fileName}</span>
          {(evmbenchJob?.created_at || auditReport?.triggered_at) && (
            <>
              <span className="text-text-muted">Created</span>
              <span className="text-text-primary tabular-nums">
                {formatDateTime(evmbenchJob?.created_at ?? auditReport?.triggered_at)}
              </span>
            </>
          )}
          {evmbenchJob?.started_at && (
            <>
              <span className="text-text-muted">Started</span>
              <span className="text-text-primary tabular-nums">
                {formatDateTime(evmbenchJob.started_at)}
              </span>
            </>
          )}
        </div>

        {auditReport?.status === "failed" && auditReport.raw_output && (
          <p className="text-sm text-red-400 mb-4">{auditReport.raw_output}</p>
        )}

        <div className="flex justify-end">
          <Button variant="primary" onClick={onClose}>
            {isDone ? "Close" : "Minimize"}
          </Button>
        </div>
      </div>
    </div>
  );
}
