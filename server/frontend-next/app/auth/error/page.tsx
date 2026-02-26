"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";
import { ArrowLeft, AlertCircle } from "lucide-react";

const ERROR_MESSAGES: Record<string, string> = {
  backend_unreachable:
    "Backend is not running. Start it with: ./run-local-ui.sh start",
  not_configured:
    "GitHub OAuth is not configured. Go to /auth/setup to set it up.",
  unknown: "An unknown error occurred during sign-in.",
  redirect_uri_mismatch:
    "GitHub OAuth callback URL mismatch. Ensure your GitHub OAuth app has Authorization callback URL set to: http://localhost:3001/auth/github/callback (or your frontend URL + /auth/github/callback)",
  access_denied: "You denied access to the application.",
  missing_code_or_state:
    "OAuth callback missing code or state. Try: 1) Clear cookies for localhost:3001, then click Log in again. 2) GitHub OAuth app callback must be exactly: http://localhost:3001/auth/github/callback (use localhost, not 127.0.0.1). 3) Use a private/incognito window. 4) Do not refresh during the GitHub redirect.",
  wrong_callback_url:
    "GitHub is redirecting to the wrong URL. Your GitHub OAuth app must have Authorization callback URL set to the FRONTEND (not the backend). For local dev: http://localhost:3001/auth/github/callback — Go to GitHub → Settings → Developer settings → OAuth Apps → your app → Edit → fix the callback URL.",
  invalid_state: "Invalid OAuth state. Try again from the Log in button.",
  token_exchange_failed:
    "Failed to exchange GitHub code for token. The code may have expired, or the callback URL in your GitHub OAuth app does not match.",
};

export default function AuthErrorPage() {
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
              href="/auth/github"
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
