"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/Button";

export interface ManualReportModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (markdown: string) => Promise<void>;
  title: string;
  loading?: boolean;
}

export function ManualReportModal({
  open,
  onClose,
  onSubmit,
  title,
  loading = false,
}: ManualReportModalProps) {
  const [markdown, setMarkdown] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      const trimmed = markdown.trim();
      if (!trimmed) {
        setError("Markdown content is required");
        return;
      }
      try {
        await onSubmit(trimmed);
        setMarkdown("");
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save report");
      }
    },
    [markdown, onSubmit, onClose]
  );

  const handleClose = useCallback(() => {
    if (!loading) {
      setError(null);
      onClose();
    }
  }, [loading, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={handleClose}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-2xl rounded-xl border border-border bg-bg-secondary p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          {title}
        </h2>
        <p className="text-sm text-text-muted mb-4">
          Paste or write your report in Markdown format. It will be stored and
          displayed as the report for this contract.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="manual-report-markdown"
              className="block text-sm font-medium text-text-muted mb-1"
            >
              Markdown content
            </label>
            <textarea
              id="manual-report-markdown"
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              disabled={loading}
              rows={12}
              className="w-full rounded-lg border border-border bg-bg-tertiary px-4 py-3 text-text-primary font-mono text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/50 resize-y min-h-[200px]"
              placeholder="# Report title&#10;&#10;## Summary&#10;...&#10;&#10;## Findings&#10;..."
            />
          </div>
          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="ghost" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? "Saving..." : "Save Report"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
