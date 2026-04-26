"use client";

import { motion } from "framer-motion";
import { Boxes, Search, Bot } from "lucide-react";
import { SectionHeader } from "./LiveStats";

const STEPS = [
  {
    icon: Boxes,
    eyebrow: "01 · Index",
    title: "Every verified contract on every chain.",
    body: "Continuous scanners stream verified contracts from Ethereum, BSC, Arbitrum, Optimism, Base, Polygon, Linea, Scroll, and more. Verified source, deployment metadata, ERC-20 balances, and proxy targets all land in one queryable place — ready to look up the moment they hit-chain.",
  },
  {
    icon: Search,
    eyebrow: "02 · Look up",
    title: "Paste an address — read findings instantly.",
    body: "Open the dashboard, drop in any address. If the contract is already audited, every Critical / High / Medium finding renders inline with full description, location, PoC results, and remediation guidance. No signup, no API keys.",
  },
  {
    icon: Bot,
    eyebrow: "03 · Or audit on demand",
    title: "Not audited yet? Spin up a Plamen run.",
    body: "Add any contract manually and trigger a fresh audit. Plamen orchestrates 40-100 specialized AI agents across recon, breadth, depth, fuzz, chain analysis, PoC verification, and skeptic-judge. Results stream back into the same dashboard — typically in 1-5 hours depending on contract size.",
    plamen: true,
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="relative border-t border-border/40 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeader
          eyebrow="The flow"
          title="Index. Look up. Or audit on demand."
          sub="The full loop, from on-chain deployment to security findings on your screen."
        />

        <div className="relative mt-20">
          <div
            aria-hidden
            className="absolute left-1/2 top-12 hidden h-[calc(100%-6rem)] w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-border to-transparent md:block"
          />

          <div className="space-y-16 md:space-y-24">
            {STEPS.map((s, i) => (
              <Step key={s.eyebrow} step={s} index={i} side={i % 2 === 0 ? "left" : "right"} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Step({
  step,
  index,
  side,
}: {
  step: typeof STEPS[number];
  index: number;
  side: "left" | "right";
}) {
  const Icon = step.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.7, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
      className={`relative grid grid-cols-1 items-center gap-8 md:grid-cols-2 ${
        side === "right" ? "md:[&>div:first-child]:order-2" : ""
      }`}
    >
      <div className={side === "right" ? "md:text-right" : ""}>
        <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/5 px-3 py-1 text-xs font-mono uppercase tracking-wider text-accent">
          {step.eyebrow}
        </div>
        <h3 className="mt-4 text-2xl font-semibold leading-tight tracking-tight text-text-primary sm:text-3xl">
          {step.title}
        </h3>
        <p className="mt-3 max-w-md text-text-muted leading-relaxed">{step.body}</p>
        {step.plamen && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-md border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs">
            <span className="text-accent font-mono uppercase tracking-wider">Plamen</span>
            <span className="text-text-muted">·</span>
            <span className="text-text-primary">autonomous multi-agent audit framework</span>
          </div>
        )}
      </div>

      <div className="relative">
        <div className="relative mx-auto flex h-32 w-32 items-center justify-center rounded-2xl border border-border/60 bg-bg-secondary/60 backdrop-blur md:mx-0 md:h-48 md:w-48 md:rounded-3xl">
          <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_center,rgba(0,255,157,0.18),transparent_70%)] md:rounded-3xl" />
          <Icon className="relative h-12 w-12 text-accent md:h-16 md:w-16" />
          <div className="absolute -right-3 -top-3 flex h-9 w-9 items-center justify-center rounded-full border border-accent/40 bg-bg-primary font-mono text-sm font-semibold text-accent">
            {String(index + 1).padStart(2, "0")}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
