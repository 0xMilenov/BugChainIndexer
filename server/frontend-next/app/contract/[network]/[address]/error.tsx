"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Header } from "@/components/Header";
import { useChunkErrorRecovery } from "@/hooks/useChunkErrorRecovery";

export default function ContractError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useChunkErrorRecovery(error);
  useEffect(() => {
    console.error("Contract page error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-ink-0">
      <Header onShowBookmarks={() => window.location.href = "/"} bookmarkCount={0} />
      <div className="max-w-2xl mx-auto p-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-blue-text hover:text-blue-text-dim hover:underline mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to search
        </Link>
        <div className="rounded-xl border border-sev-crit/30 bg-sev-crit/5 p-6">
          <h1 className="text-lg font-semibold text-sev-crit-text mb-2">
            Something went wrong
          </h1>
          <p className="text-faint text-sm mb-4">
            {error.message}
          </p>
          <button
            type="button"
            onClick={reset}
            className="px-4 py-2 rounded-lg bg-ink-2 border border-rule hover:bg-blue-600/10 text-body text-sm font-medium"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
