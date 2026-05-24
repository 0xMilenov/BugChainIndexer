"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { loginLocal } from "@/lib/auth";
import { ArrowLeft, Loader2, LogIn } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { refreshAuth, signupUrl } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await loginLocal(username, password);
      await refreshAuth();
      router.push("/");
      router.refresh();
    } catch (err) {
      setError((err as Error)?.message || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary bg-grid-overlay">
      <Header />
      <main className="mx-auto max-w-md px-4 py-8">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-sm text-accent hover:text-accent-dim hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>

        <form
          onSubmit={submit}
          className="rounded-lg border border-border bg-bg-secondary p-5 shadow-sm"
        >
          <h1 className="mb-5 text-lg font-semibold text-text-primary">Log in</h1>
          <label className="mb-4 block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-text-muted">
              Username
            </span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              className="w-full rounded-md border border-border bg-bg-primary px-3 py-2 text-text-primary outline-none focus:border-accent"
              required
            />
          </label>
          <label className="mb-4 block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-text-muted">
              Password
            </span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
              className="w-full rounded-md border border-border bg-bg-primary px-3 py-2 text-text-primary outline-none focus:border-accent"
              required
            />
          </label>
          {error && (
            <div className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-accent/40 bg-accent/15 px-4 py-2 font-semibold text-accent transition hover:bg-accent/25 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
            Log in
          </button>
          <div className="mt-4 text-center text-sm text-text-muted">
            <Link href={signupUrl} className="text-accent hover:underline">
              Sign up
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
