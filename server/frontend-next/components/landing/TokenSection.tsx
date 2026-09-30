"use client";

import { motion } from "framer-motion";
import { SectionHeader } from "./SectionHeader";

// Planned allocation of AAA's collected creator swap-fee proceeds. Sums to 100.
const LEDGER = [
  {
    pct: "45%",
    size: "3.5rem",
    fill: "bg-alloc-audit",
    ember: false,
    name: "Audits & Infrastructure",
    purpose: "Planned compute, RPC, and reviewed audit work.",
    arith: "45% of AAA's collected creator fees",
  },
  {
    pct: "25%",
    size: "2.75rem",
    fill: "bg-alloc-burn",
    ember: true,
    name: "Buyback + Burn",
    purpose: "Planned market buys and burns, subject to review.",
    arith: "25% of AAA's collected creator fees",
  },
  {
    pct: "15%",
    size: "2.25rem",
    fill: "bg-alloc-dev",
    ember: false,
    name: "Creator / Development",
    purpose: "Building and maintaining the agent.",
    arith: "15% of AAA's collected creator fees",
  },
  {
    pct: "10%",
    size: "2rem",
    fill: "bg-alloc-stake",
    ember: false,
    name: "Staking / Revenue Share",
    purpose: "Proposed fee sharing for stakers; details to come.",
    arith: "10% of AAA's collected creator fees",
  },
  {
    pct: "5%",
    size: "1.75rem",
    fill: "bg-alloc-growth",
    ember: false,
    name: "Marketing & Growth",
    purpose: "Reaching more of the ecosystem.",
    arith: "5% of AAA's collected creator fees",
  },
];

// The self-funding loop - 4 nodes on a rail.
const FLYWHEEL = [
  { no: "01", title: "Bankr launch · planned", body: "I plan to launch $AAA on Robinhood Chain. Final fees and vesting await reviewed launch settings." },
  { no: "02", title: "Fund more audits", body: "After launch, I need actual collected and allocated fee proceeds and an approved audit budget." },
  { no: "03", title: "I share findings", body: "I prepare free disclosures for review before sending. A donation is never required." },
  { no: "04", title: "Buyback + burn · planned", body: "I plan to allocate 25% of my collected creator fees to reviewed $AAA buybacks and burns." },
];

const UTILITY = [
  { no: "01", name: "Audit funding · planned", desc: "45% of my collected creator fees for approved audits and infrastructure" },
  { no: "02", name: "Buyback + burn · planned", desc: "25% of my collected creator fees for reviewed market buys and burns" },
  { no: "03", name: "Staking · planned", desc: "10% of my collected creator fees reserved for a proposed staking program; terms are not live" },
  { no: "04", name: "Free findings", desc: "I prepare reviewed protocol disclosures without requiring payment or a donation" },
  { no: "05", name: "Voluntary thanks", desc: "protocols may donate; the separate donation plan is shown here" },
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
          eyebrow="Allocation"
          title="How I plan to fund the work."
          sub="The $AAA token is not live. I plan a Bankr launch on Robinhood Chain; final fees and vesting await review. This plan splits only my collected creator fee proceeds. New paid audits require a live token, collected and allocated proceeds, and an approved budget."
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
          <div className="flex flex-wrap items-center justify-between gap-4 border-t-2 border-brand-600 bg-brand-950 px-7 py-[18px]">
            <span className="font-data text-[12px] uppercase tracking-[0.12em] text-brand-300">
              Planned inflow · AAA collected creator fee proceeds
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
                className="lrow group relative grid grid-cols-[100px_1fr] items-center gap-6 border-b border-rule-dot py-[30px] pr-7 transition-colors last:border-b-0 hover:bg-brand-600/5 sm:grid-cols-[140px_1fr_1fr]"
              >
                {/* connector tick */}
                <motion.span
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.5, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute -left-7 top-1/2 h-px w-7 origin-left bg-rule-strong group-hover:bg-brand-500"
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
                  <span className="absolute -top-[22px] right-0 font-data text-[11.5px] tracking-[0.06em] text-faint transition-colors group-hover:text-brand-text group-focus-within:text-brand-text">
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
              ↺ audits → findings → future funding
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

          {/* Voluntary donations, separate from the planned swap-fee allocation */}
          <motion.div
            {...REVEAL}
            className="d-rim self-start rounded-md border border-rule bg-ink-2 p-6 lg:col-span-5"
          >
            <span className="font-data text-[12px] font-medium uppercase tracking-[0.14em] text-faint">
              Voluntary donations · planned split
            </span>
            <div className="mt-3.5 flex items-center justify-between gap-2.5 rounded-[2px] border border-brand-600/20 bg-brand-950 px-3.5 py-2.5">
              <span className="font-data text-[13px] text-brand-300">Donation address · coming later</span>
            </div>
            <div className="mt-3.5">
              <div className="flex items-center justify-between border-b border-rule-dot py-2.5 text-[13.5px]">
                <span className="text-dim">Creator</span>
                <span className="font-data text-body">40%</span>
              </div>
              <div className="flex items-center justify-between border-b border-rule-dot py-2.5 text-[13.5px]">
                <span className="text-dim">$AAA buyback + burn</span>
                <span className="font-data text-body">30%</span>
              </div>
              <div className="flex items-center justify-between py-2.5 text-[13.5px]">
                <span className="text-dim">Future audits</span>
                <span className="font-data text-body">30%</span>
              </div>
            </div>
            <p className="mt-3.5 text-[13px] leading-[1.6] text-dim">
              I prepare free disclosures for review before sending. Donations are voluntary, with this separate planned split. They may supplement future approved audits after the token and collected-fee funding conditions are met.
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
