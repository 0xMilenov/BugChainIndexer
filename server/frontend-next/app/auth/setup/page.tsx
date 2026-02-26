"use client";

import Link from "next/link";
import { Header } from "@/components/Header";
import { ArrowLeft, ExternalLink } from "lucide-react";

const GITHUB_OAUTH_NEW = "https://github.com/settings/applications/new";

export default function AuthSetupPage() {
  const callbackUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/auth/github/callback`
      : "http://localhost:3000/auth/github/callback";

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

        <div className="rounded-xl border border-border bg-bg-secondary p-6 space-y-6">
          <h1 className="text-xl font-semibold text-text-primary">
            GitHub OAuth Setup
          </h1>
          <p className="text-text-muted text-sm">
            To enable &quot;Log in with GitHub&quot;, you must register an OAuth
            app with GitHub. GitHub requires a <code className="px-1 py-0.5 rounded bg-bg-tertiary">client_id</code> in
            the authorize URL before it can redirect users to the authorization
            page.
          </p>

          <ol className="list-decimal list-inside space-y-4 text-sm text-text-primary">
            <li>
              <a
                href={GITHUB_OAUTH_NEW}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-accent hover:text-accent-dim hover:underline"
              >
                Create a new OAuth App on GitHub
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </li>
            <li>
              <span className="font-medium">Application name:</span> e.g.
              &quot;VISUALISA&quot; or &quot;BugChainIndexer&quot;
            </li>
            <li>
              <span className="font-medium">Homepage URL:</span> e.g.{" "}
              <code className="px-1 py-0.5 rounded bg-bg-tertiary text-xs">
                http://localhost:3000
              </code>
            </li>
            <li>
              <span className="font-medium">Authorization callback URL:</span>{" "}
              <code className="px-1 py-0.5 rounded bg-bg-tertiary text-xs break-all">
                {callbackUrl}
              </code>
            </li>
            <li>
              Click &quot;Register application&quot;, then copy the{" "}
              <strong>Client ID</strong> and generate a{" "}
              <strong>Client Secret</strong>.
            </li>
            <li>
              Add these to <code className="px-1 py-0.5 rounded bg-bg-tertiary">server/backend/.env</code>:
              <pre className="mt-2 p-3 rounded-lg bg-bg-tertiary text-xs overflow-x-auto">
{`GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
AUTH_JWT_SECRET=random-32-char-string
FRONTEND_URL=http://localhost:3000`}
              </pre>
            </li>
            <li>
              Restart the backend, then click &quot;Log in&quot; again. You will
              be redirected to GitHub to authorize the app.
            </li>
          </ol>

          <a
            href={GITHUB_OAUTH_NEW}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-bg-tertiary text-accent hover:bg-accent/10 border border-border transition"
          >
            Create GitHub OAuth App
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </main>
    </div>
  );
}
