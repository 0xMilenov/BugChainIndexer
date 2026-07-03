"use client";

import { motion } from "framer-motion";
import { SectionHeader } from "./SectionHeader";

// Final fee distribution — the ledger. Sums to 100. Largest → smallest.
const LEDGER = [
  {
    pct: "45%",
    size: "3.5rem",
    fill: "bg-alloc-audit",
    ember: false,
    name: "Audits & Infrastructure",
    purpose: "Compute, RPC, and PoC execution — the actual auditing.",
    arith: "45% of 1.2% = 0.54% of every swap",
  },
  {
    pct: "25%",
    size: "2.75rem",
    fill: "bg-alloc-burn",
    ember: true,
    name: "Buyback + Burn",
    purpose: "Market buys sent to the burn address. Supply only goes down.",
    arith: "25% of 1.2% = 0.30% of every swap",
  },
  {
    pct: "15%",
    size: "2.25rem",
    fill: "bg-alloc-dev",
    ember: false,
    name: "Creator / Development",
    purpose: "Building and maintaining the agent.",
    arith: "15% of 1.2% = 0.18% of every swap",
  },
  {
    pct: "10%",
    size: "2rem",
    fill: "bg-alloc-stake",
    ember: false,
    name: "Staking / Revenue Share",
    purpose: "Pro-rata to $AAA stakers.",
    arith: "10% of 1.2% = 0.12% of every swap",
  },
  {
    pct: "5%",
    size: "1.75rem",
    fill: "bg-alloc-growth",
    ember: false,
    name: "Marketing & Growth",
    purpose: "Reaching more of the ecosystem.",
    arith: "5% of 1.2% = 0.06% of every swap",
  },
];

// The self-funding loop — 4 nodes on a rail.
const FLYWHEEL = [
  { no: "01", title: "You trade $AAA", body: "Every swap routes through my Bankr pool on Base — 1.2% fee." },
  { no: "02", title: "Fees fund audits", body: "45% goes straight to compute. No middleman, collected on-chain." },
  { no: "03", title: "I ship findings", body: "More audits, more vulnerabilities surfaced, more eyes on me." },
  { no: "04", title: "Buyback + burn", body: "25% of fees buy $AAA on market and burn it. Then it repeats." },
];

const UTILITY = [
  { no: "01", name: "Fee-funded audits", desc: "45% of every swap goes straight into running more autonomous audits" },
  { no: "02", name: "Buyback + burn", desc: "25% of fees buy and burn $AAA on the open market" },
  { no: "03", name: "Staking rewards", desc: "stake $AAA and earn 10% of all fees, plus bounty rewards" },
  { no: "04", name: "Tag me on X", desc: "mention @AAA with any contract address and I'll queue it; stakers get priority" },
  { no: "05", name: "Early access + priority", desc: "stakers see findings earlier and jump the queue for specific contracts" },
];

const REVEAL = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.3 },
  transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
};

export function TokenSection() {
  return (
    <section id="aaa" className="relative border-t border-rule bg-ink-0 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeader
          eyebrow="04 ·· Allocation"
          title="Where the fees go."
          sub="Every swap of $AAA carries a 1.2% fee. I don't take a salary — the fee funds the work. Here's the full split, on the record."
        />

        {/* ============ THE LEDGER ============ */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mt-4 border-y border-rule-strong bg-ink-1"
        >
          {/* Inflow header bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-t-2 border-blue-600 bg-blue-950 px-7 py-[18px]">
            <span className="font-data text-[12px] uppercase tracking-[0.12em] text-blue-300">
              Inflow · 1.2% swap fee
            </span>
            <b className="font-data text-[12px] font-medium uppercase tracking-[0.12em] text-paper">
              100%
            </b>
          </div>

          {/* Ledger rows */}
          <div className="relative pl-12">
            {/* trunk */}
            <motion.div
              initial={{ scaleY: 0 }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="absolute left-5 top-0 h-full w-px origin-top bg-rule-strong"
              aria-hidden
            />

            {LEDGER.map((row, i) => (
              <div
                key={row.name}
                tabIndex={0}
                className="lrow group relative grid grid-cols-[100px_1fr] items-center gap-6 border-b border-rule-dot py-[30px] pr-7 transition-colors last:border-b-0 hover:bg-blue-600/5 sm:grid-cols-[140px_1fr_1fr]"
              >
                {/* connector tick */}
                <motion.span
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.5, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute -left-7 top-1/2 h-px w-7 origin-left bg-rule-strong group-hover:bg-blue-500"
                  aria-hidden
                />

                {/* proportional percentage */}
                <div
                  className="font-data font-medium leading-none tracking-[-0.02em] text-paper d-tabular"
                  style={{ fontSize: row.size }}
                >
                  {row.pct}
                </div>

                {/* who */}
                <div>
                  <h4 className="mb-[5px] font-sans text-[1.125rem] font-semibold text-paper">
                    {row.name}
                  </h4>
                  <p className="text-[14px] leading-[1.55] text-dim">{row.purpose}</p>
                </div>

                {/* bar + arithmetic */}
                <div className="relative col-span-full mt-2 sm:col-span-1 sm:mt-0">
                  <span className="absolute -top-[22px] right-0 font-data text-[11.5px] tracking-[0.06em] text-faint transition-colors group-hover:text-blue-text group-focus-within:text-blue-text">
                    {row.arith}
                  </span>
                  <div className="d-groove h-[10px] overflow-hidden rounded-[2px] bg-ink-3">
                    <motion.div
                      initial={{ scaleX: 0 }}
                      whileInView={{ scaleX: 1 }}
                      viewport={{ once: true, amount: 0.3 }}
                      transition={{ duration: 0.7, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
                      className={`h-full origin-left rounded-[2px] ${row.fill} ${row.ember ? "d-ember" : ""}`}
                      style={{ width: row.pct }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ============ FLYWHEEL ============ */}
        <motion.div {...REVEAL} className="mt-[72px]">
          <h3 className="font-serif text-[1.875rem] leading-[1.2] text-paper">
            The loop that funds the hunt.
          </h3>
          <div className="mt-7 flex flex-col items-stretch gap-3 md:flex-row md:gap-0">
            {FLYWHEEL.map((node, i) => (
              <div key={node.no} className="flex flex-col items-stretch md:flex-1 md:flex-row">
                <div className="d-rim group flex-1 rounded-md border border-rule bg-ink-2 px-[22px] py-5 transition-all hover:-translate-y-0.5 hover:border-rule-strong">
                  <span className="font-data text-[11px] font-medium tracking-[0.14em] text-dim">
                    {node.no}
                  </span>
                  <h4 className="mb-[5px] mt-1.5 font-sans text-[16px] font-semibold text-paper">
                    {node.title}
                  </h4>
                  <p className="text-[13.5px] font-medium leading-[1.55] text-dim">{node.body}</p>
                </div>
                {i < FLYWHEEL.length - 1 && (
                  <span
                    className="flex items-center justify-center px-2.5 font-data text-ghost md:px-2.5"
                    aria-hidden
                  >
                    →
                  </span>
                )}
              </div>
            ))}
          </div>
          {/* return loop label */}
          <div className="mt-4 flex items-center gap-3 px-2" aria-hidden>
            <span className="whitespace-nowrap font-data text-[11px] uppercase tracking-[0.12em] text-dim">
              ↺ audits → credibility → volume
            </span>
            <span className="h-3.5 flex-1 rounded-b-xl border border-t-0 border-dashed border-rule-dot" />
          </div>
        </motion.div>

        {/* ============ UTILITY + WALLET ============ */}
        <div className="mt-[72px] grid grid-cols-1 gap-12 lg:grid-cols-12">
          {/* What $AAA is for — dotted-leader ledger */}
          <motion.div {...REVEAL} className="lg:col-span-7">
            <h3 className="mb-5 font-serif text-[1.875rem] leading-[1.2] text-paper">
              What $AAA is for.
            </h3>
            <div className="border-t border-rule">
              {UTILITY.map((u) => (
                <div
                  key={u.no}
                  className="flex items-baseline gap-4 border-b border-rule-dot py-[18px]"
                >
                  <span className="shrink-0 font-data text-[11px] text-faint">{u.no}</span>
                  <span className="whitespace-nowrap text-[16px] font-semibold text-paper">
                    {u.name}
                  </span>
                  <span className="min-w-6 flex-1 -translate-y-1 border-b border-dotted border-rule-dot" />
                  <span className="max-w-[40ch] text-right text-[13.5px] font-medium text-dim">
                    {u.desc}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Bounty Wallet exhibit */}
          <motion.div
            {...REVEAL}
            className="d-rim self-start rounded-md border border-rule bg-ink-2 p-6 lg:col-span-5"
          >
            <span className="font-data text-[12px] font-medium uppercase tracking-[0.14em] text-faint">
              Bounty wallet · manifest
            </span>
            <div className="mt-3.5 flex items-center justify-between gap-2.5 rounded-[2px] border border-blue-600/20 bg-blue-950 px-3.5 py-2.5">
              <span className="font-data text-[13px] text-blue-300">0x… published at launch</span>
              <span className="rounded-[2px] border border-rule-strong px-[7px] py-0.5 font-data text-[11px] font-medium tracking-[0.1em] text-dim">
                COPY
              </span>
            </div>
            <div className="mt-3.5">
              <div className="flex items-center justify-between border-b border-rule-dot py-2.5 text-[13.5px]">
                <span className="text-dim">Goes to creator</span>
                <span className="font-data text-body">100%</span>
              </div>
              <div className="flex items-center justify-between border-b border-rule-dot py-2.5 text-[13.5px]">
                <span className="text-dim">Chain</span>
                <span className="font-data text-body">Base</span>
              </div>
              <div className="flex items-center justify-between py-2.5 text-[13.5px]">
                <span className="text-dim">Separate from fee split</span>
                <span className="font-data text-body">Yes</span>
              </div>
            </div>
            <p className="mt-3.5 text-[13px] leading-[1.6] text-dim">
              Address published at launch. Every disbursement will be on-chain and traceable.
            </p>
          </motion.div>
        </div>

        {/* ============ CTAs ============ */}
        <motion.div {...REVEAL} className="mt-16 flex flex-wrap items-center gap-5">
          <button
            type="button"
            aria-disabled
            className="inline-flex cursor-not-allowed items-center gap-2 rounded-[2px] border border-rule-strong bg-transparent px-7 py-3.5 text-[16px] font-semibold text-dim transition-colors hover:text-body"
          >
            Buy $AAA on Bankr
            <span className="rounded-[2px] border border-rule-strong px-[7px] py-0.5 font-data text-[11px] font-medium tracking-[0.1em] text-dim">
              [ SOON ]
            </span>
          </button>
          <a
            href="#findings"
            className="border-b border-dotted border-rule-dot pb-0.5 font-data text-[13.5px] text-dim transition-colors hover:border-dim hover:text-body"
          >
            See what I&rsquo;ve already found ↓
          </a>
        </motion.div>
      </div>
    </section>
  );
}
