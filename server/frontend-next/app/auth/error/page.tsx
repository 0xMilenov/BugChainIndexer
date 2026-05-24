"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";
import { ArrowLeft, AlertCircle } from "lucide-react";

const ERROR_MESSAGES: Record<string, string> = {
  backend_unreachable:
    "Backend is not running. Start it with: ./run-local-ui.sh start",
  not_configured:
    "Authentication is not configured.",
  unknown: "An unknown error occurred during sign-in.",
  access_denied: "Access denied.",
};

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const errorKey = searchParams.get("message") || searchParams.get("auth_error") || "unknown";
  const landed = searchParams.get("landed");
  const message = ERROR_MESSAGES[errorKey] || decodeURIComponent(errorKey.replace(/\+/g, " "));

  return (
    <div className="min-h-screen bg-bg-primary bg-grid-overlay">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-accent hover:text-accent-dim hover:underline mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to search
        </Link>

        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-6 w-6 text-red-400 flex-shrink-0" />
            <h1 className="text-xl font-semibold text-red-400">Sign-in Error</h1>
          </div>
          <p className="text-text-primary">{message}</p>
          <p className="text-sm text-text-muted">
            Error code: <code className="px-1 py-0.5 rounded bg-bg-tertiary">{errorKey}</code>
          </p>
          {landed && (
            <p className="text-xs text-text-muted break-all">
              URL you landed on: <code className="px-1 py-0.5 rounded bg-bg-tertiary">{decodeURIComponent(landed)}</code>
            </p>
          )}
          <div className="flex gap-3 pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-bg-tertiary text-text-primary hover:bg-bg-secondary transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to search
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-accent text-accent hover:bg-accent/10 transition"
            >
              Try again
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg-primary flex items-center justify-center">Loading...</div>}>
      <AuthErrorContent />
    </Suspense>
  );
}
