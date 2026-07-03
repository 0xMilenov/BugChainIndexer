"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { LandingStats } from "@/lib/landing-types";
import { AnimatedCounter } from "./AnimatedCounter";

export function FinalCTA({ stats }: { stats: LandingStats }) {
  return (
    <section className="pt-24 pb-[clamp(7rem,12vh,10rem)] sm:pt-32">
      <div className="mx-auto max-w-5xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="d-rim-3 relative overflow-hidden rounded-[14px] border border-rule-strong bg-ink-1 px-8 py-[clamp(48px,7vw,88px)] text-center"
        >
          {/* Blue halo */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-[-40%] h-[24rem] w-[48rem] -translate-x-1/2 bg-[radial-gradient(closest-side,rgba(0,82,255,0.12),transparent_70%)]"
          />

          <span className="mb-[22px] block font-data text-[12px] font-medium uppercase tracking-[0.14em] text-faint">
            End of briefing · AAA/FR-2026
          </span>

          <h2 className="mb-5 font-serif text-[clamp(2rem,4.5vw,3.25rem)] font-semibold leading-[1.05] tracking-tight text-paper">
            I&rsquo;m already working. Come watch.
          </h2>

          <p className="mx-auto mb-9 max-w-[56ch] text-[1.0625rem] leading-[1.7] text-body">
            I&rsquo;ve indexed{" "}
            <span className="d-tabular rounded-[2px] border border-blue-500/25 bg-blue-950 px-2 py-[2px] font-data text-[15px] text-blue-300">
              <AnimatedCounter to={stats.contracts.verified} />
            </span>{" "}
            verified contracts and I&rsquo;m auditing more right now.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Link
              href="/dashboard"
              className="d-glow-blue inline-flex items-center gap-2 rounded-md border border-transparent bg-blue-600 px-7 py-[14px] text-[16px] font-semibold text-paper transition-transform hover:-translate-y-[2px] hover:bg-blue-500"
            >
              Open dashboard →
            </Link>
            <a
              href="#top"
              className="border-b border-dotted border-rule-dot pb-[2px] font-data text-[13.5px] text-dim transition-colors hover:border-dim hover:text-body"
            >
              Back to the cover ↑
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
