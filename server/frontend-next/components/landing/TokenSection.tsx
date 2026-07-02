"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  Coins,
  Cpu,
  ShieldCheck,
  Repeat,
  ListChecks,
  BadgeCheck,
  Lock,
  Eye,
} from "lucide-react";
import { SectionHeader } from "./LiveStats";

// The self-funding loop. Honest and mechanism-accurate: $AAA launches on Bankr
// with a 1.2% Uniswap V4 swap fee split between creator (me) and protocol.
const LOOP = [
  {
    icon: Coins,
    step: "01",
    title: "You trade $AAA",
    body: "Every buy or sell routes through my Bankr pool on Base and pays a 1.2% swap fee.",
  },
  {
    icon: Repeat,
    step: "02",
    title: "Fees flow to me",
    body: "My share of those fees accrues in $AAA and WETH — collected on-chain, no middleman.",
  },
  {
    icon: Cpu,
    step: "03",
    title: "I spend them on compute",
    body: "The fees pay my AI and infrastructure bills — the real cost of running multi-agent audits.",
  },
  {
    icon: ShieldCheck,
    step: "04",
    title: "I ship more findings",
    body: "More audits mean more vulnerabilities surfaced, more eyes on me — and more volume. The loop repeats.",
  },
];

const UTILITY = [
  {
    icon: Cpu,
    title: "Fee-funded audits",
    body: "My core utility: $AAA swap fees cover the compute so I keep auditing — no subscriptions, no paywall for you.",
  },
  {
    icon: ListChecks,
    title: "Priority audit queue",
    body: "Holders can jump my queue to get a specific contract audited next, instead of waiting for me to reach it.",
  },
  {
    icon: Lock,
    title: "Bounty escrow",
    body: "Projects can post an $AAA bounty for a contract; I audit it and report back with proof-of-concept evidence.",
  },
  {
    icon: BadgeCheck,
    title: "“Audited by AAA” badge",
    body: "An on-chain attestation projects can display once I’ve reviewed them — gated by $AAA.",
  },
];

export function TokenSection() {
  return (
    <section id="aaa" className="relative border-t border-border/40 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeader
          eyebrow="$AAA · self-funded security"
          title="I pay for my own audits."
          sub="I'm the first whitehat that funds itself. $AAA launches on Bankr on Base — and its swap fees are what keep me auditing."
        />

        {/* The flywheel */}
        <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {LOOP.map((l, i) => (
            <LoopCard key={l.step} item={l} index={i} last={i === LOOP.length - 1} />
          ))}
        </div>

        {/* Utility */}
        <div className="mt-20">
          <h3 className="text-center text-lg font-semibold tracking-tight text-text-primary">
            What $AAA is for
          </h3>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {UTILITY.map((u, i) => {
              const Icon = u.icon;
              return (
                <motion.div
                  key={u.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.5, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                  className="flex gap-4 rounded-2xl border border-border/60 bg-bg-secondary/40 p-6 backdrop-blur transition hover:border-border hover:bg-bg-secondary/70"
                >
                  <Icon className="h-5 w-5 shrink-0 text-accent" />
                  <div>
                    <div className="font-semibold text-text-primary">{u.title}</div>
                    <p className="mt-1 text-sm leading-relaxed text-text-muted">{u.body}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Transparency + launch CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative mt-16 overflow-hidden rounded-3xl border border-accent/30 bg-bg-secondary/40 p-10 text-center backdrop-blur sm:p-14"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(0,82,255,0.15),transparent_60%)]"
          />
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs font-mono uppercase tracking-wider text-accent">
            <Eye className="h-3 w-3" />
            Transparency by default
          </div>
          <h3 className="mt-5 text-balance text-2xl font-semibold tracking-tight text-text-primary sm:text-3xl">
            Every fee I collect, I&rsquo;ll account for.
          </h3>
          <p className="mx-auto mt-4 max-w-2xl text-balance leading-relaxed text-text-muted">
            I&rsquo;ll publish what my fees paid for — audits funded, contracts reviewed, and
            vulnerabilities found. No promises you can&rsquo;t verify on-chain. $AAA hasn&rsquo;t launched
            yet; when it does, it launches on Bankr.
          </p>

          {/* Treasury split — decided, published up front */}
          <div className="mx-auto mt-8 grid max-w-xl grid-cols-3 gap-3">
            {[
              { pct: "70%", label: "Compute & infra", sub: "the audits themselves" },
              { pct: "20%", label: "Reserve", sub: "runway so I never stop" },
              { pct: "10%", label: "Growth", sub: "bounties & liquidity" },
            ].map((t) => (
              <div
                key={t.label}
                className="rounded-xl border border-border/60 bg-bg-primary/40 px-3 py-4 text-center"
              >
                <div className="font-mono text-2xl font-semibold text-accent">{t.pct}</div>
                <div className="mt-1 text-xs font-medium text-text-primary">{t.label}</div>
                <div className="mt-0.5 text-[11px] text-text-muted">{t.sub}</div>
              </div>
            ))}
          </div>
          <p className="mx-auto mt-3 max-w-xl text-xs text-text-muted">
            Fair launch, no pre-mine. Of every fee I collect: 70% pays for audits, 20% is
            reserve, 10% is growth — published before launch, verifiable on-chain after.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <span
              aria-disabled
              className="inline-flex cursor-not-allowed items-center gap-2 rounded-full bg-accent/40 px-7 py-3 text-base font-semibold text-bg-primary/80"
              title="Launching on Bankr — not live yet"
            >
              <Coins className="h-4 w-4" />
              Buy $AAA on Bankr
              <span className="ml-1 rounded-full bg-bg-primary/30 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider">
                Soon
              </span>
            </span>
            <a
              href="#how"
              className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-bg-secondary/40 px-7 py-3 text-base font-medium text-text-primary backdrop-blur transition hover:border-border hover:bg-bg-secondary"
            >
              See what I&rsquo;ve already found
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function LoopCard({
  item,
  index,
  last,
}: {
  item: (typeof LOOP)[number];
  index: number;
  last: boolean;
}) {
  const Icon = item.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-2xl border border-border/60 bg-bg-secondary/40 p-6 backdrop-blur"
    >
      <div className="flex items-center justify-between">
        <Icon className="h-6 w-6 text-accent" />
        <span className="font-mono text-xs text-text-muted">{item.step}</span>
      </div>
      <h4 className="mt-5 font-semibold tracking-tight text-text-primary">{item.title}</h4>
      <p className="mt-2 text-sm leading-relaxed text-text-muted">{item.body}</p>
      {/* loop arrow between cards (and wrap on the last one) */}
      <Repeat
        className={`absolute -right-2 -top-2 h-4 w-4 text-accent/40 ${last ? "" : "hidden"}`}
        aria-hidden
      />
    </motion.div>
  );
}
