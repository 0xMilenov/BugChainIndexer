"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Header } from "@/components/Header";

export default function ContractError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Contract page error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-bg-primary">
      <Header onShowBookmarks={() => window.location.href = "/"} bookmarkCount={0} />
      <div className="max-w-2xl mx-auto p-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-accent hover:text-accent-dim hover:underline mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to search
        </Link>
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-6">
          <h1 className="text-lg font-semibold text-red-400 mb-2">
            Something went wrong
          </h1>
          <p className="text-text-muted text-sm mb-4">
            {error.message}
          </p>
          <button
            type="button"
            onClick={reset}
            className="px-4 py-2 rounded-lg bg-bg-tertiary border border-border hover:bg-accent/10 text-text-primary text-sm font-medium"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
