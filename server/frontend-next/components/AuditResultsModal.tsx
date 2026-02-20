"use client";

import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { VulnerabilityCard } from "@/components/VulnerabilityCard";
import ReactMarkdown from "react-markdown";
import type { AuditReport } from "@/lib/api";

export interface AuditResultsModalProps {
  open: boolean;
  onClose: () => void;
  auditReport: AuditReport | null;
}

export function AuditResultsModal({
  open,
  onClose,
  auditReport,
}: AuditResultsModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] rounded-xl border border-border bg-bg-secondary shadow-xl flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-bg-tertiary flex-shrink-0">
          <h2 className="text-lg font-semibold text-text-primary">AI Audit Report</h2>
          <div className="mt-2 flex flex-wrap gap-2 items-center">
            <Badge
              variant={
                auditReport?.status === "completed"
                  ? "success"
                  : auditReport?.status === "failed"
                    ? "warning"
                    : "muted"
              }
            >
              {auditReport?.status === "pending"
                ? "In progress..."
                : auditReport?.status === "completed"
                  ? "Completed"
                  : auditReport?.status === "failed"
                    ? "Failed"
                    : auditReport?.status ?? "—"}
            </Badge>
            {auditReport?.model && (
              <span className="text-xs text-text-muted">Model: {auditReport.model}</span>
            )}
            {auditReport?.report_json?.manual && (
              <Badge variant="muted">Manual</Badge>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {!auditReport && (
            <p className="text-text-muted text-sm">No audit report available.</p>
          )}
          {auditReport?.status === "pending" && (
            <p className="text-text-muted text-sm">
              Audit is running. This may take several minutes.
            </p>
          )}
          {auditReport?.status === "failed" && (
            <p className="text-red-400 text-sm">
              {auditReport.raw_output || "Audit failed"}
            </p>
          )}
          {auditReport?.status === "completed" && auditReport.report_json?.manual && (
            <div className="markdown-content text-sm text-text-primary [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:text-base [&_h2]:font-semibold [&_h3]:text-sm [&_h3]:font-medium [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-2 [&_pre]:bg-bg-tertiary [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_code]:bg-bg-tertiary [&_code]:px-1 [&_code]:rounded [&_a]:text-accent [&_a]:hover:underline">
              <ReactMarkdown>{auditReport.report_json.markdown || ""}</ReactMarkdown>
            </div>
          )}
          {auditReport?.status === "completed" &&
            !auditReport.report_json?.manual &&
            auditReport.report_json?.vulnerabilities && (
              <div className="space-y-3">
                {auditReport.report_json.vulnerabilities.length === 0 ? (
                  <p className="text-text-muted text-sm">
                    No vulnerabilities found.
                  </p>
                ) : (
                  auditReport.report_json.vulnerabilities.map((vuln, idx) => (
                    <VulnerabilityCard key={idx} vuln={vuln} />
                  ))
                )}
              </div>
            )}
        </div>
        <div className="px-4 py-3 border-t border-border flex-shrink-0 flex justify-end">
          <Button variant="primary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
