"use client";

import { AlertCircle } from "lucide-react";

interface ErrorStateProps {
  message: string;
}

export function ErrorState({ message }: ErrorStateProps) {
  const isFetchError = /failed to fetch|network error|load failed/i.test(message);
  return (
    <div className="rounded-md border border-sev-crit/40 bg-sev-crit/5 p-8 text-center">
      <div className="mb-4">
        <AlertCircle className="mx-auto mb-2 h-12 w-12 text-sev-crit-text" />
        <h3 className="text-lg font-semibold text-body">Search Failed</h3>
        <p className="mt-2 text-sm text-sev-crit-text">{message}</p>
        {isFetchError && (
          <p className="mt-2 text-xs text-faint">
            Ensure the backend is running: <code className="rounded bg-ink-2 px-1">cd server/backend && node index.js</code>
          </p>
        )}
        <button
          onClick={() => window.location.reload()}
          className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-paper text-sm transition hover:bg-blue-700"
        >
          Reload Page
        </button>
      </div>
    </div>
  );
}
