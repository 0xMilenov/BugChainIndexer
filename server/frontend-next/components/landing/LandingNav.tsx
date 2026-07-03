"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import type { LandingStats } from "@/lib/landing-types";

const SECTIONS = [
  { id: "stats", label: "01 Coverage" },
  { id: "how", label: "02 Procedure" },
  { id: "features", label: "03 Capabilities" },
  { id: "aaa", label: "04 $AAA" },
  { id: "findings", label: "05 Findings" },
];

function relativeTime(ts: number | null): string {
  if (!ts) return "";
  const diff = Math.max(0, Math.floor(Date.now() / 1000 - ts));
  if (diff < 90) return `${diff}s ago`;
  if (diff < 5400) return `${Math.round(diff / 60)} min ago`;
  if (diff < 129600) return `${Math.round(diff / 3600)} h ago`;
  return `${Math.round(diff / 86400)} d ago`;
}

export function LandingNav({ stats }: { stats?: LandingStats }) {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<string>("stats");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id);
        });
      },
      { rootMargin: "-40% 0px -55% 0px" }
    );
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);

  const lastAudit = stats?.recent_audits?.[0]?.completed_at ?? null;
  const liveReadout =
    stats && lastAudit
      ? `LIVE · ${stats.audits.total} AUDITS · ${relativeTime(lastAudit)}`
      : stats
        ? `LIVE · ${stats.audits.total} AUDITS`
        : "";

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 h-14 border-b transition-colors duration-200 ${
        scrolled
          ? "border-rule bg-ink-0/85 shadow-[0_4px_16px_rgb(0_0_0/0.5)] backdrop-blur-xl"
          : "border-transparent"
      }`}
    >
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between gap-4 px-6">
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
          <span className="h-1.5 w-1.5 shrink-0 rounded-[2px] bg-signal d-glow-signal d-breathe" aria-hidden />
          <span className="font-serif text-xl font-medium tracking-[0.02em] text-paper">AAA</span>
          {scrolled && liveReadout ? (
            <span className="hidden truncate font-data text-[11px] uppercase tracking-[0.14em] text-signal sm:inline">
              {liveReadout}
            </span>
          ) : (
            <span className="hidden truncate font-data text-[11px] uppercase tracking-[0.14em] text-faint sm:inline">
              / Autonomous Audit Agent
            </span>
          )}
        </Link>

        <nav className="hidden items-center gap-7 lg:flex" aria-label="Sections">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className={`relative py-1 font-data text-[11.5px] uppercase tracking-[0.14em] transition-colors ${
                active === s.id ? "text-paper" : "text-dim hover:text-paper"
              }`}
            >
              {s.label}
              {active === s.id && (
                <span className="absolute inset-x-0 -bottom-0.5 h-px bg-blue-600" />
              )}
            </a>
          ))}
        </nav>

        <Link
          href="/dashboard"
          className="group inline-flex items-center gap-2 rounded-[6px] bg-blue-600 px-3.5 py-2 text-[13px] font-semibold text-white transition hover:bg-blue-500 hover:shadow-[var(--glow-blue)]"
        >
          Open dashboard
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </header>
  );
}
