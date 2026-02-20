"use client";

import { AlertCircle } from "lucide-react";

interface ErrorStateProps {
  message: string;
}

export function ErrorState({ message }: ErrorStateProps) {
  const isFetchError = /failed to fetch|network error|load failed/i.test(message);
  return (
    <div className="rounded-xl border border-red-500/40 bg-red-500/5 p-8 text-center">
      <div className="mb-4">
        <AlertCircle className="mx-auto mb-2 h-12 w-12 text-red-400" />
        <h3 className="text-lg font-semibold text-text-primary">Search Failed</h3>
        <p className="mt-2 text-sm text-red-400">{message}</p>
        {isFetchError && (
          <p className="mt-2 text-xs text-text-muted">
            Ensure the backend is running: <code className="rounded bg-bg-tertiary px-1">cd server/backend && node index.js</code>
          </p>
        )}
        <button
          onClick={() => window.location.reload()}
          className="mt-4 rounded-lg bg-accent px-4 py-2 text-bg-primary text-sm transition hover:bg-accent-dim"
        >
          Reload Page
        </button>
      </div>
    </div>
  );
}
