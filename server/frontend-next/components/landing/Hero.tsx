"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Search, Bot } from "lucide-react";
import { GridBackground } from "./GridBackground";
import { AnimatedCounter } from "./AnimatedCounter";
import { formatCompactNumber, type LandingStats } from "@/lib/landing-types";

interface HeroProps {
  stats: LandingStats;
}

export function Hero({ stats }: HeroProps) {
  return (
    <section className="relative isolate flex min-h-[100svh] items-center overflow-hidden pt-20">
      <GridBackground />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-24 pt-12 text-center">
        {/* Eyebrow / live indicator */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mx-auto inline-flex items-center gap-2 rounded-full border border-border/60 bg-bg-secondary/40 px-3 py-1 text-xs font-mono uppercase tracking-wider text-text-muted backdrop-blur"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
          </span>
          live · {stats.contracts.networks} chains · {formatCompactNumber(stats.contracts.total)} contracts indexed
        </motion.div>

        {/* Display headline */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="mt-8 text-balance text-[clamp(2.75rem,7vw,5.5rem)] font-semibold leading-[1.05] tracking-tight text-text-primary"
        >
          Every contract on-chain.{" "}
          <span className="relative inline-block">
            <span className="bg-gradient-to-br from-accent via-accent-soft to-accent-amber bg-clip-text text-transparent">
              Every audit a click away.
            </span>
            <span className="absolute inset-x-0 -bottom-1 h-[2px] bg-gradient-to-r from-transparent via-accent to-transparent opacity-50" />
          </span>
        </motion.h1>

        {/* Subhead */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto mt-6 max-w-2xl text-balance text-base leading-relaxed text-text-muted sm:text-lg"
        >
          Visualisa indexes verified smart contracts across{" "}
          <span className="text-text-primary">{stats.contracts.networks} EVM networks</span>.
          Look up any address to see live security findings inline. Or trigger a fresh
          autonomous audit on demand — powered by{" "}
          <span className="text-accent">Plamen</span>, the best-in-class multi-agent
          audit framework.
        </motion.p>

        {/* CTA pair */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <Link
            href="/dashboard"
            className="group relative inline-flex items-center gap-2 rounded-full bg-accent px-7 py-3 text-base font-semibold text-bg-primary shadow-[0_0_40px_-4px_rgba(0,255,157,0.6)] transition hover:bg-accent-soft hover:shadow-[0_0_60px_-4px_rgba(0,255,157,0.9)]"
          >
            <Search className="h-4 w-4" />
            Open Dashboard
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            <span className="absolute inset-0 -z-10 rounded-full bg-accent opacity-0 blur-xl transition-opacity group-hover:opacity-50" />
          </Link>
          <a
            href="#how"
            className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-bg-secondary/40 px-7 py-3 text-base font-medium text-text-primary backdrop-blur transition hover:border-border hover:bg-bg-secondary"
          >
            <Bot className="h-4 w-4 text-accent" />
            See how it works
          </a>
        </motion.div>

        {/* Inline numbers strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.9 }}
          className="mx-auto mt-16 grid w-full max-w-3xl grid-cols-3 divide-x divide-border/40 rounded-2xl border border-border/40 bg-bg-secondary/30 backdrop-blur"
        >
          <HeroNum value={stats.contracts.total} label="Contracts indexed" />
          <HeroNum value={stats.audits.total} label="Audits completed" />
          <HeroNum value={stats.audits.findings} label="Vulnerabilities surfaced" />
        </motion.div>
      </div>
    </section>
  );
}

function HeroNum({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-3 py-5 text-center sm:px-6 sm:py-6">
      <div className="font-mono text-2xl font-semibold tracking-tight text-text-primary sm:text-3xl">
        <AnimatedCounter to={value} format={(n) => n.toLocaleString()} />
      </div>
      <div className="mt-1 text-[11px] font-mono uppercase tracking-wider text-text-muted">
        {label}
      </div>
    </div>
  );
}
