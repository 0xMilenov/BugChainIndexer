"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export interface ImportEvmbenchJobModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (evmbenchJobId: string) => Promise<void>;
  loading?: boolean;
}

export function ImportEvmbenchJobModal({
  open,
  onClose,
  onSubmit,
  loading = false,
}: ImportEvmbenchJobModalProps) {
  const [jobId, setJobId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      const id = jobId.trim();
      if (!id) {
        setError("evmbench job ID is required");
        return;
      }
      try {
        await onSubmit(id);
        setJobId("");
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to import job");
      }
    },
    [jobId, onSubmit, onClose]
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
      <div className="relative z-10 w-full max-w-md rounded-xl border border-border bg-bg-secondary p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Import evmbench Job
        </h2>
        <p className="text-sm text-text-muted mb-4">
          Enter the evmbench job ID (UUID) from a job you ran in evmbench to
          import its results here.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="import-job-id"
              className="block text-sm font-medium text-text-muted mb-1"
            >
              evmbench Job ID
            </label>
            <Input
              id="import-job-id"
              type="text"
              placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
              disabled={loading}
              autoComplete="off"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex gap-3 justify-end pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? "Importing..." : "Import"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
