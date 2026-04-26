"use client";

import { motion } from "framer-motion";
import {
  Activity,
  Bot,
  CircleDot,
  Code2,
  GitBranch,
  Layers,
  Network,
  Plus,
  ShieldCheck,
  Workflow,
} from "lucide-react";
import { SectionHeader } from "./LiveStats";

const TILES = [
  {
    icon: Bot,
    title: "Powered by Plamen",
    body: "Plamen is the autonomous Web3 audit framework Visualisa runs under the hood. ~40-100 specialized AI agents across 8 phases: recon, breadth, depth iter 1+2 (Devil's Advocate), fuzz, chain analysis, PoC verification, skeptic-judge, report assembly. Best-in-class — and open source.",
    span: "lg:col-span-2 lg:row-span-2",
    accent: true,
  },
  {
    icon: Plus,
    title: "Audit on demand",
    body: "Drop any address into the dashboard. If we don't have an audit yet, click to trigger one. Plamen takes it from there — results stream back into the same UI when complete.",
    span: "",
  },
  {
    icon: Network,
    title: "13 EVM networks",
    body: "Ethereum, BSC, Arbitrum, Optimism, Base, Polygon, Linea, Scroll, Mantle, Gnosis, Avalanche, OpBNB, MegaETH — one query interface.",
    span: "",
  },
  {
    icon: ShieldCheck,
    title: "Severity, scored honestly",
    body: "4-axis confidence (Evidence, Consensus, Quality, RAG). TRUSTED-ACTOR downgrade rules. Skeptic-judge reviews every Critical and High before persistence — so you don't see noise.",
    span: "lg:col-span-2",
  },
  {
    icon: Code2,
    title: "PoC-verified findings",
    body: "Phase 5 of every audit writes runnable Foundry tests. Pass / fail / revert is recorded. Findings on the dashboard carry [POC-PASS] tags when mechanically proven.",
    span: "",
  },
  {
    icon: Workflow,
    title: "Compound attack chains",
    body: "Postcondition→precondition matching across all findings. Discovers exploits where one bug's side effect enables another bug's attack path.",
    span: "",
  },
  {
    icon: Layers,
    title: "Source-aware extraction",
    body: "Handles Etherscan single-file, multi-file solc-j, and standard JSON formats. Auto-detects Foundry source roots, derives remappings on the fly. Just works.",
    span: "",
  },
  {
    icon: Activity,
    title: "Live findings ticker",
    body: "Critical and high findings flow through the dashboard in real time. Click any contract to see severity badges and the full report inline.",
    span: "",
  },
  {
    icon: GitBranch,
    title: "Pause + resume",
    body: "Multi-hour audits survive rate limits. Session state persisted continuously; resume from the exact phase boundary with one command — no re-runs from scratch.",
    span: "",
  },
  {
    icon: CircleDot,
    title: "No signup. No API key. Free.",
    body: "Every counter on this page renders from a 5-minute Postgres cache. No rate limits, no paywall — built to run as a public good for the Web3 security community.",
    span: "lg:col-span-2",
  },
];

export function FeatureBento() {
  return (
    <section id="features" className="relative border-t border-border/40 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeader
          eyebrow="What's inside"
          title="Built for actual audit work, not demos."
          sub="Every tile maps to real code in production. The dashboard you'll open is wired to all of it."
        />

        <div className="mt-16 grid auto-rows-[minmax(180px,auto)] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TILES.map((t, i) => (
            <Tile key={t.title} tile={t} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Tile({
  tile,
  index,
}: {
  tile: (typeof TILES)[number];
  index: number;
}) {
  const Icon = tile.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, delay: (index % 4) * 0.06, ease: [0.22, 1, 0.36, 1] }}
      className={`group relative overflow-hidden rounded-2xl border border-border/60 bg-bg-secondary/40 p-6 backdrop-blur transition hover:border-border hover:bg-bg-secondary/70 ${tile.span}`}
    >
      {tile.accent && (
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(0,255,157,0.12),transparent_60%)]" />
      )}
      <Icon className={`h-6 w-6 ${tile.accent ? "text-accent" : "text-text-primary"}`} />
      <h3
        className={`mt-5 leading-snug tracking-tight text-text-primary ${
          tile.accent ? "text-xl sm:text-2xl font-semibold" : "text-lg font-semibold"
        }`}
      >
        {tile.title}
      </h3>
      <p className={`mt-3 text-sm leading-relaxed text-text-muted ${tile.accent ? "max-w-prose" : ""}`}>
        {tile.body}
      </p>
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
    </motion.div>
  );
}
