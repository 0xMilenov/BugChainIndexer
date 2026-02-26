"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-xl border border-red-500/30 bg-red-500/5 p-6">
        <h1 className="text-lg font-semibold text-red-400 mb-2">
          Something went wrong
        </h1>
        <p className="text-text-muted text-sm mb-4">
          {error.message}
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={reset}
            className="px-4 py-2 rounded-lg bg-bg-tertiary border border-border hover:bg-accent/10 text-text-primary text-sm font-medium"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent/10 border border-accent/30 text-accent hover:bg-accent/20 text-sm font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to search
          </Link>
        </div>
      </div>
    </div>
  );
}
