"use client";

import { motion } from "framer-motion";
import { Database, ShieldAlert, AlertOctagon, Radio } from "lucide-react";
import { AnimatedCounter } from "./AnimatedCounter";
import type { LandingStats } from "@/lib/landing-types";

interface LiveStatsProps {
  stats: LandingStats;
}

export function LiveStats({ stats }: LiveStatsProps) {
  const cards = [
    {
      icon: Database,
      label: "Verified contracts indexed",
      value: stats.contracts.verified,
      sub: `${stats.contracts.networks} EVM networks · live`,
      tone: "accent" as const,
    },
    {
      icon: Radio,
      label: "Autonomous audits completed",
      value: stats.audits.total,
      sub: "multi-agent · proof-of-concept verified",
      tone: "accent" as const,
    },
    {
      icon: AlertOctagon,
      label: "High & critical findings",
      value: stats.audits.critical + stats.audits.high,
      sub: `${stats.audits.critical} critical · ${stats.audits.high} high`,
      tone: "danger" as const,
    },
    {
      icon: ShieldAlert,
      label: "Total vulnerabilities surfaced",
      value: stats.audits.findings,
      sub: `${stats.audits.medium} medium · ${stats.audits.high} high · ${stats.audits.critical} critical`,
      tone: "warn" as const,
    },
  ];

  return (
    <section id="stats" className="relative border-t border-border/40 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeader
          eyebrow="Live coverage"
          title="Indexed at scale, audited with depth."
          sub="Every number on this page is queried live from the same Postgres that powers the dashboard. No vanity metrics."
        />

        <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c, i) => (
            <StatCard key={c.label} card={c} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function StatCard({
  card,
  index,
}: {
  card: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: number;
    sub: string;
    tone: "accent" | "danger" | "warn";
  };
  index: number;
}) {
  const Icon = card.icon;
  const toneRing = {
    accent: "ring-accent/30",
    danger: "ring-red-500/30",
    warn: "ring-amber-500/30",
  }[card.tone];
  const toneText = {
    accent: "text-accent",
    danger: "text-red-400",
    warn: "text-amber-400",
  }[card.tone];

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.6, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      className={`group relative overflow-hidden rounded-2xl border border-border/60 bg-bg-secondary/40 p-6 ring-1 ring-inset ${toneRing} backdrop-blur transition hover:border-border hover:bg-bg-secondary/70`}
    >
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,rgba(0,255,157,0.08),transparent_60%)] opacity-0 transition-opacity group-hover:opacity-100" />
      <Icon className={`h-5 w-5 ${toneText}`} />
      <div className="mt-6 font-mono text-4xl font-semibold tracking-tight text-text-primary">
        <AnimatedCounter to={card.value} format={(n) => n.toLocaleString()} />
      </div>
      <div className="mt-2 text-sm text-text-primary">{card.label}</div>
      <div className="mt-1 text-xs text-text-muted">{card.sub}</div>
    </motion.div>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  sub,
  align = "center",
}: {
  eyebrow: string;
  title: string;
  sub?: string;
  align?: "left" | "center";
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className={`max-w-3xl ${align === "center" ? "mx-auto text-center" : ""}`}
    >
      <div className="mb-4 inline-flex items-center gap-2 text-xs font-mono uppercase tracking-[0.2em] text-accent">
        <span className="h-px w-8 bg-accent/60" />
        {eyebrow}
      </div>
      <h2 className="text-balance text-[clamp(1.75rem,4vw,3rem)] font-semibold leading-[1.1] tracking-tight text-text-primary">
        {title}
      </h2>
      {sub && (
        <p className="mt-4 text-balance text-base leading-relaxed text-text-muted sm:text-lg">
          {sub}
        </p>
      )}
    </motion.div>
  );
}
