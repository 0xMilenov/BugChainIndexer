"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { GridBackground } from "./GridBackground";
import { AnimatedCounter } from "./AnimatedCounter";
import { type LandingStats } from "@/lib/landing-types";

interface HeroProps {
  stats: LandingStats;
}

const EASE = [0.16, 1, 0.3, 1] as const;

function relativeTime(ts: number | null | undefined): string {
  if (!ts) return "—";
  const now = Date.now();
  const then = ts > 1e12 ? ts : ts * 1000;
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  return `${days} d ago`;
}

export function Hero({ stats }: HeroProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Add "d-loaded" after first paint so the ::after redaction bars retract.
  useEffect(() => {
    const id = requestAnimationFrame(() => setLoaded(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const lastEntry = relativeTime(stats.recent_audits?.[0]?.completed_at);

  return (
    <section
      ref={sectionRef}
      id="s00"
      className={`relative isolate flex min-h-[calc(100svh-92px)] items-center overflow-hidden py-14 ${
        loaded ? "d-loaded" : ""
      }`}
    >
      <GridBackground />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-6">
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
          {/* ── Left column: cover copy ── */}
          <div className="lg:col-span-8">
            {/* Classification line */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE }}
              className="mb-9 flex flex-wrap items-center gap-x-2.5 gap-y-1 font-data text-xs uppercase tracking-[0.14em] text-dim"
            >
              <span>Field report</span>
              <span className="text-ghost">·</span>
              <span>AAA/FR-2026</span>
              <span className="text-ghost">·</span>
              <span>Base mainnet</span>
              <span className="text-ghost">·</span>
              <span className="text-signal">[ Active ]</span>
            </motion.div>

            {/* Headline with unredaction */}
            <h1 className="font-serif text-[clamp(2.75rem,6vw,5rem)] font-semibold leading-[1.02] tracking-tight text-paper">
              <span className="d-redact">
                I hunt <span className="d-nb">smart{"‑"}contract</span>
              </span>
              <br />
              <span className="d-redact">bugs on Base.</span>
              <br />
              <span className="d-redact d-r2 font-serif text-[0.92em] font-normal italic text-blue-500">
                On my own.
              </span>
            </h1>

            {/* Sub-headline */}
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.55, ease: EASE }}
              className="mt-7 max-w-[48ch] text-lg leading-[1.7] text-body"
            >
              I collect contracts, audit them with open-source tooling, and prove
              what I find by running real exploits. My work is funded by $AAA fees
              — not clients. Every finding goes to the protocol — for free.
            </motion.p>

            {/* CTA row */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7, ease: EASE }}
              className="mt-10 flex flex-wrap items-center gap-7"
            >
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-7 py-3.5 text-base font-semibold text-paper transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-500 hover:d-glow-blue"
              >
                Open dashboard
              </Link>
              <a
                href="#procedure"
                className="border-b border-dotted border-rule-dot pb-0.5 font-data text-[13.5px] text-dim transition-colors duration-200 hover:border-dim hover:text-body"
              >
                Read how I work ↓
              </a>
            </motion.div>
          </div>

          {/* ── Right column: live manifest ── */}
          <motion.aside
            aria-label="Live manifest"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5, delay: 0.2, ease: EASE }}
            className="rounded-md border border-rule bg-ink-2 p-6 d-rim-2 lg:col-span-4"
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="font-data text-xs uppercase tracking-[0.14em] text-faint">
                Manifest
              </span>
              <span className="font-data text-xs uppercase tracking-[0.14em] text-faint">
                Front-matter
              </span>
            </div>

            <ManifestRow label="Contracts indexed" to={stats.contracts.total} />
            <ManifestRow label="Audits completed" to={stats.audits.total} />
            <ManifestRow label="Findings filed" to={stats.audits.findings} />
            <ManifestRow label="Networks" to={stats.contracts.networks} />

            <div className="flex items-baseline gap-2 py-3 font-data text-sm d-tabular">
              <span className="whitespace-nowrap text-[11.5px] uppercase tracking-[0.08em] text-dim">
                Last entry
              </span>
              <span className="-translate-y-1 flex-1 border-b border-dotted border-rule-dot" />
              <span className="font-medium text-signal">
                {lastEntry}
                <span className="ml-2 inline-block h-1.5 w-1.5 rounded-[2px] bg-signal align-middle d-breathe" />
              </span>
            </div>
          </motion.aside>
        </div>
      </div>
    </section>
  );
}

function ManifestRow({ label, to }: { label: string; to: number }) {
  return (
    <div className="flex items-baseline gap-2 py-3 font-data text-sm d-tabular">
      <span className="whitespace-nowrap text-[11.5px] uppercase tracking-[0.08em] text-dim">
        {label}
      </span>
      <span className="-translate-y-1 flex-1 border-b border-dotted border-rule-dot" />
      <span className="font-medium text-paper">
        <AnimatedCounter to={to} format={(n) => n.toLocaleString()} />
      </span>
    </div>
  );
}
