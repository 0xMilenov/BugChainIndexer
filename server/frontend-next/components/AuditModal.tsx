"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const MODELS = [
  { value: "codex-gpt-5.2", label: "Codex GPT 5.2" },
  { value: "codex-gpt-5.1-codex-max", label: "Codex GPT 5.1 Codex Max" },
] as const;

export interface AuditModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (openaiKey: string, model: string) => Promise<void>;
  loading?: boolean;
}

export function AuditModal({
  open,
  onClose,
  onSubmit,
  loading = false,
}: AuditModalProps) {
  const [openaiKey, setOpenaiKey] = useState("");
  const [model, setModel] = useState("codex-gpt-5.2");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      const key = openaiKey.trim();
      if (!key) {
        setError("OpenAI API key is required");
        return;
      }
      try {
        await onSubmit(key, model);
        setOpenaiKey("");
        // Do not call onClose - parent transitions to progress modal
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to start audit");
      }
    },
    [openaiKey, model, onSubmit]
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
          AI Audit
        </h2>
        <p className="text-sm text-text-muted mb-4">
          Enter your OpenAI API key to run an AI-powered security audit. Your
          key is sent directly to the audit service and is not stored.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="audit-openai-key"
              className="block text-sm font-medium text-text-muted mb-1"
            >
              OpenAI API Key
            </label>
            <Input
              id="audit-openai-key"
              type="password"
              placeholder="sk-..."
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              disabled={loading}
              autoComplete="off"
            />
          </div>
          <div>
            <label
              htmlFor="audit-model"
              className="block text-sm font-medium text-text-muted mb-1"
            >
              Model
            </label>
            <select
              id="audit-model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              disabled={loading}
              className="w-full rounded-lg border border-border bg-bg-secondary px-4 py-2 text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/50"
            >
              {MODELS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="ghost" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? "Starting..." : "Start Audit"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
