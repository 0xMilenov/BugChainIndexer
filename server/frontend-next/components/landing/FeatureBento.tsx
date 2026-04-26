"use client";

import { motion } from "framer-motion";
import {
  Activity,
  Bot,
  Code2,
  GitBranch,
  Layers,
  Network,
  ShieldCheck,
  Workflow,
  Zap,
} from "lucide-react";
import { SectionHeader } from "./LiveStats";

const TILES = [
  {
    icon: Bot,
    title: "Autonomous audit pipeline",
    body: "Plamen orchestrates ~50 specialized agents across 8 phases. Recon, breadth, depth iter 1+2 (Devil's Advocate), chain analysis, PoC verification, skeptic-judge, report assembly.",
    span: "lg:col-span-2 lg:row-span-2",
    accent: true,
  },
  {
    icon: Network,
    title: "Multi-chain coverage",
    body: "13 EVM networks. Same query interface across Ethereum, BSC, Arbitrum, Optimism, Base, Polygon, Linea, Scroll, Mantle, Gnosis, Avalanche, OpBNB, MegaETH.",
    span: "",
  },
  {
    icon: ShieldCheck,
    title: "Severity matrix scored",
    body: "4-axis confidence (Evidence, Consensus, Quality, RAG). TRUSTED-ACTOR downgrade rules. Skeptic-judge reviews every Critical and High before persistence.",
    span: "",
  },
  {
    icon: Workflow,
    title: "Chain analysis",
    body: "Postcondition→precondition matching across all findings. Discovers compound exploits where one finding's side effect enables another finding's attack path.",
    span: "lg:col-span-2",
  },
  {
    icon: Code2,
    title: "Foundry PoC verification",
    body: "Phase 5 writes runnable Foundry tests for every Medium+ finding. Pass/fail/revert is recorded. CONFIRMED findings carry [POC-PASS] tags.",
    span: "",
  },
  {
    icon: Activity,
    title: "Live ticker",
    body: "Critical and high findings flow through the dashboard in real time. Click any contract to see severity badges and the full report inline.",
    span: "",
  },
  {
    icon: Layers,
    title: "Source-aware extraction",
    body: "Handles Etherscan single-file, multi-file solc-j, and standard JSON formats. Auto-detects Foundry source roots, derives remappings on the fly.",
    span: "",
  },
  {
    icon: GitBranch,
    title: "Pause + resume",
    body: "Multi-hour audits survive rate limits. Session JSONL is persisted continuously; resume from the exact phase boundary with one command.",
    span: "",
  },
  {
    icon: Zap,
    title: "Cached, fast, free",
    body: "All severity counts and stats render from a 5-minute Postgres cache. No API key, no signup, no rate limits — built to run as a public good.",
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
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(0,255,157,0.10),transparent_60%)]" />
      )}
      <Icon className={`h-6 w-6 ${tile.accent ? "text-accent" : "text-text-primary"}`} />
      <h3
        className={`mt-5 text-lg font-semibold leading-snug tracking-tight ${
          tile.accent ? "text-text-primary text-xl sm:text-2xl" : "text-text-primary"
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
