"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import type { LandingStats } from "@/lib/landing-types";
import { formatCompactNumber } from "@/lib/landing-types";

export function FinalCTA({ stats }: { stats: LandingStats }) {
  return (
    <section className="relative border-t border-border/40 py-24 sm:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-3xl border border-border/60 bg-bg-secondary/40 p-12 text-center backdrop-blur sm:p-20"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_30%_20%,rgba(0,255,157,0.18),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(255,184,0,0.10),transparent_50%)]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 [background-image:linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
          />

          <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/5 px-3 py-1 text-xs font-mono uppercase tracking-wider text-accent">
            <Sparkles className="h-3 w-3" />
            Free · No signup · Live now
          </div>

          <h2 className="mt-6 text-balance text-[clamp(2rem,5vw,3.5rem)] font-semibold leading-tight tracking-tight text-text-primary">
            Look up a contract.
            <br />
            See its bugs. Or audit it now.
          </h2>

          <p className="mx-auto mt-6 max-w-xl text-balance text-base leading-relaxed text-text-muted sm:text-lg">
            {formatCompactNumber(stats.contracts.verified)} verified contracts indexed and ready to query.
            Pre-audited findings render instantly. New audits run on demand,
            powered by <span className="text-accent">Plamen</span>.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/dashboard"
              className="group relative inline-flex items-center gap-2 rounded-full bg-accent px-8 py-4 text-base font-semibold text-bg-primary shadow-[0_0_50px_-4px_rgba(0,255,157,0.7)] transition hover:bg-accent-soft hover:shadow-[0_0_70px_-4px_rgba(0,255,157,1)]"
            >
              Open the dashboard
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <a
              href="https://github.com/0xMilenov/BugChainIndexer"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-bg-secondary/40 px-8 py-4 text-base font-medium text-text-primary backdrop-blur transition hover:border-border hover:bg-bg-secondary"
            >
              View source on GitHub
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
