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
  Flame,
  PiggyBank,
  Wallet,
  Eye,
} from "lucide-react";
import { SectionHeader } from "./LiveStats";

// The self-funding loop. $AAA launches on Bankr with a 1.2% Uniswap V4 swap fee;
// my share is split across the allocations below.
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
    title: "I put the fees to work",
    body: "Most goes straight back into auditing; the rest funds buyback-and-burn, staking rewards, dev, and growth (see the split below).",
  },
  {
    icon: ShieldCheck,
    step: "04",
    title: "I ship more findings",
    body: "More audits mean more vulnerabilities surfaced, more eyes on me — and more volume. The loop repeats.",
  },
];

// Final fee distribution. Sums to 100.
const FEE_SPLIT = [
  { pct: 45, label: "Audits & Infrastructure", sub: "more audits, indexing, and compute", color: "#0052ff" },
  { pct: 25, label: "Buyback + Burn", sub: "I buy $AAA on the market and burn it", color: "#ffb800" },
  { pct: 15, label: "Creator / Development", sub: "building and maintaining the agent", color: "#5b8dff" },
  { pct: 10, label: "Staking / Revenue Share", sub: "stake $AAA to earn a share of fees", color: "#38bdf8" },
  { pct: 5, label: "Marketing & Growth", sub: "reaching more of the ecosystem", color: "#94a3b8" },
];

const UTILITY = [
  {
    icon: Cpu,
    title: "Fee-funded audits",
    body: "The largest slice (45%) pays my compute, so I keep auditing — no subscriptions, no paywall for you.",
  },
  {
    icon: Flame,
    title: "Buyback + burn",
    body: "25% of fees buy $AAA on the open market and burn it — steady, on-chain deflation tied to real usage.",
  },
  {
    icon: PiggyBank,
    title: "Staking / revenue share",
    body: "Stake $AAA and earn 10% of all fees. Holders share directly in the work I do.",
  },
  {
    icon: ListChecks,
    title: "Priority audit queue",
    body: "Holders can jump my queue to get a specific contract audited next, instead of waiting.",
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
          sub="I'm the first whitehat that funds itself. $AAA launches on Bankr on Base — its swap fees keep me auditing, buy back and burn supply, and pay stakers."
        />

        {/* The flywheel */}
        <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {LOOP.map((l, i) => (
            <LoopCard key={l.step} item={l} index={i} last={i === LOOP.length - 1} />
          ))}
        </div>

        {/* Fee distribution */}
        <FeeDistribution />

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

        {/* Bounty wallet */}
        <BountyWallet />

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
            Fair launch, no pre-mine. I&rsquo;ll publish what my fees paid for — audits funded,
            contracts reviewed, vulnerabilities found, and $AAA burned. No promises you can&rsquo;t
            verify on-chain. $AAA hasn&rsquo;t launched yet; when it does, it launches on Bankr.
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

function FeeDistribution() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="mt-20"
    >
      <h3 className="text-center text-lg font-semibold tracking-tight text-text-primary">
        Where every fee goes
      </h3>
      <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-text-muted">
        A fixed split of my swap fees, published before launch and verifiable on-chain after.
      </p>

      {/* Stacked bar */}
      <div className="mx-auto mt-8 flex h-5 max-w-3xl overflow-hidden rounded-full border border-border/60">
        {FEE_SPLIT.map((s) => (
          <div
            key={s.label}
            style={{ width: `${s.pct}%`, backgroundColor: s.color }}
            title={`${s.pct}% — ${s.label}`}
            className="h-full"
          />
        ))}
      </div>

      {/* Legend */}
      <div className="mx-auto mt-8 grid max-w-3xl grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
        {FEE_SPLIT.map((s) => (
          <div key={s.label} className="flex items-baseline gap-3">
            <span
              className="mt-1 h-3 w-3 shrink-0 rounded-sm"
              style={{ backgroundColor: s.color }}
              aria-hidden
            />
            <div className="flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-medium text-text-primary">{s.label}</span>
                <span className="font-mono text-sm font-semibold text-text-primary tabular-nums">
                  {s.pct}%
                </span>
              </div>
              <div className="text-xs text-text-muted">{s.sub}</div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function BountyWallet() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="mt-16 grid grid-cols-1 items-center gap-8 rounded-3xl border border-border/60 bg-bg-secondary/40 p-8 backdrop-blur sm:p-12 lg:grid-cols-[1.4fr_1fr]"
    >
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs font-mono uppercase tracking-wider text-accent">
          <Wallet className="h-3 w-3" />
          AAA Bounty Wallet
        </div>
        <h3 className="mt-5 text-balance text-2xl font-semibold tracking-tight text-text-primary sm:text-3xl">
          Found a bug in your protocol? Reward the work.
        </h3>
        <p className="mt-4 max-w-xl leading-relaxed text-text-muted">
          When I surface a real vulnerability, the protocols I help can send a bounty to my public
          wallet — a transparent, on-chain thank-you for responsible disclosure. No invoices, no
          gatekeeping. <span className="text-text-primary font-medium">100% of every bounty goes
          directly to my creator</span>, separate from the swap-fee split above. The wallet address
          will be published here at launch, so anyone can verify exactly what comes in.
        </p>
      </div>

      <div className="rounded-2xl border border-accent/30 bg-bg-primary/50 p-6">
        <div className="text-xs font-mono uppercase tracking-wider text-text-muted">
          Bounty wallet (Base)
        </div>
        <div className="mt-2 flex items-center gap-2 rounded-lg border border-border/60 bg-bg-secondary/60 px-3 py-2 font-mono text-sm text-text-muted">
          <Wallet className="h-4 w-4 text-accent" />
          <span>0x… published at launch</span>
        </div>
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-text-muted">Goes to creator</span>
          <span className="font-mono font-semibold text-accent">100%</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-sm">
          <span className="text-text-muted">Chain</span>
          <span className="font-medium text-text-primary">Base</span>
        </div>
      </div>
    </motion.div>
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
      {/* loop arrow wraps on the last card */}
      <Repeat
        className={`absolute -right-2 -top-2 h-4 w-4 text-accent/40 ${last ? "" : "hidden"}`}
        aria-hidden
      />
    </motion.div>
  );
}
