"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { SectionHeader } from "./SectionHeader";

const REVEAL = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.3 },
} as const;

const CHAINS = [
  "ethereum",
  "bsc",
  "arbitrum",
  "optimism",
  "polygon",
  "linea",
  "scroll",
  "mantle",
  "gnosis",
  "avalanche",
  "opbnb",
  "megaeth",
  "bittensor",
];

const FEE_SEGMENTS = [
  { pct: 45, className: "bg-alloc-audit" },
  { pct: 25, className: "bg-alloc-burn" },
  { pct: 15, className: "bg-alloc-dev" },
  { pct: 10, className: "bg-alloc-stake" },
  { pct: 5, className: "bg-alloc-growth" },
];

export function FeatureBento() {
  return (
    <section
      id="features"
      className="relative border-t border-rule bg-ink-1 py-24 sm:py-32"
    >
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeader
          eyebrow="03 ·· Capabilities"
          title="Built for real audit work, not demos."
          sub="Every tile below shows the thing itself — no claims without exhibits."
        />

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* PoC-verified findings — large */}
          <motion.article
            {...REVEAL}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="d-rim flex flex-col gap-3 rounded-md border border-rule bg-ink-2 p-[26px] transition-colors hover:border-rule-strong hover:bg-ink-3 lg:col-span-7 lg:row-span-2"
          >
            <span className="font-data text-[11px] font-medium uppercase tracking-[0.14em] text-dim">
              Exhibit A · Verification
            </span>
            <h3 className="font-sans text-[1.1875rem] font-semibold leading-[1.35] text-paper">
              PoC-verified findings
            </h3>
            <p className="text-[14px] leading-[1.6] text-dim">
              Phase 5 of every audit writes runnable Foundry tests. Pass, fail,
              or revert is recorded on the finding.
            </p>
            <div className="d-well mt-1 flex-1 rounded-[6px] border border-rule bg-ink-0 px-4 py-3.5 font-data text-[13px] leading-[2] text-dim">
              <div className="text-body">$ forge test --match-test test_H01 -vvv</div>
              <div>[⠔] Compiling 14 files with solc 0.8.24</div>
              <div>Ran 1 test for test/H01_FeeRounding.t.sol</div>
              <div className="text-blue-400">
                [PASS] test_H01_lastClaimantShortfall() (gas: 287,441)
              </div>
              <div>assertion: last claimant receives 15% less than pro-rata ✓</div>
              <div className="mt-1 flex items-center gap-2">
                <span className="inline-block rounded-[2px] border border-sev-crit-text/35 bg-sev-crit/10 px-[7px] py-[2px] font-data text-[11px] font-medium tracking-[0.1em] text-sev-crit-text">
                  POC-PASS
                </span>
                <span className="text-dim">filed → PoolFees · base</span>
              </div>
            </div>
          </motion.article>

          {/* 14 EVM chains */}
          <motion.article
            {...REVEAL}
            transition={{ duration: 0.5, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
            className="d-rim flex flex-col gap-3 rounded-md border border-rule bg-ink-2 p-[26px] transition-colors hover:border-rule-strong hover:bg-ink-3 lg:col-span-5"
          >
            <span className="font-data text-[11px] font-medium uppercase tracking-[0.14em] text-dim">
              Reach
            </span>
            <h3 className="font-sans text-[1.1875rem] font-semibold leading-[1.35] text-paper">
              14 EVM chains, Base first
            </h3>
            <div className="flex flex-wrap gap-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-[2px] border border-blue-600/35 bg-blue-950 px-2 py-[3px] font-data text-[11.5px] text-blue-300">
                <i className="d-breathe h-[5px] w-[5px] rounded-[1px] bg-signal" />
                base
              </span>
              {CHAINS.map((chain) => (
                <span
                  key={chain}
                  className="rounded-[2px] border border-rule px-2 py-[3px] font-data text-[11.5px] text-dim"
                >
                  {chain}
                </span>
              ))}
            </div>
          </motion.article>

          {/* Multi-agent pipeline */}
          <motion.article
            {...REVEAL}
            transition={{ duration: 0.5, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
            className="d-rim flex flex-col gap-3 rounded-md border border-rule bg-ink-2 p-[26px] transition-colors hover:border-rule-strong hover:bg-ink-3 lg:col-span-5"
          >
            <span className="font-data text-[11px] font-medium uppercase tracking-[0.14em] text-dim">
              Engine
            </span>
            <h3 className="font-sans text-[1.1875rem] font-semibold leading-[1.35] text-paper">
              Multi-agent pipeline
            </h3>
            <p className="text-[14px] leading-[1.6] text-dim">
              40–100 agents, 8 phases, skeptic-judge on every Critical and High.
              Open source.
            </p>
          </motion.article>

          {/* Autonomous funding */}
          <motion.article
            {...REVEAL}
            transition={{ duration: 0.5, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
            className="d-rim flex flex-col gap-3 rounded-md border border-rule bg-ink-2 p-[26px] transition-colors hover:border-rule-strong hover:bg-ink-3 lg:col-span-4"
          >
            <span className="font-data text-[11px] font-medium uppercase tracking-[0.14em] text-dim">
              Funding
            </span>
            <h3 className="font-sans text-[1.1875rem] font-semibold leading-[1.35] text-paper">
              Autonomous funding
            </h3>
            <div className="font-data text-[13px] text-dim">
              1.2% fee → 45 / 25 / 15 / 10 / 5
            </div>
            <div
              aria-hidden="true"
              className="d-groove flex h-[5px] overflow-hidden rounded-[2px]"
            >
              {FEE_SEGMENTS.map((seg, i) => (
                <motion.span
                  key={seg.className}
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{
                    duration: 0.5,
                    delay: 0.2 + i * 0.08,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  style={{ width: `${seg.pct}%` }}
                  className={`origin-left ${seg.className}`}
                />
              ))}
            </div>
            <Link
              href="#allocation"
              className="mt-auto self-start font-data text-[12px] tracking-[0.06em] text-blue-text transition-colors hover:text-blue-300"
            >
              Full split ↓
            </Link>
          </motion.article>

          {/* Findings wire */}
          <motion.article
            {...REVEAL}
            transition={{ duration: 0.5, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
            className="d-rim flex flex-col gap-3 rounded-md border border-rule bg-ink-2 p-[26px] transition-colors hover:border-rule-strong hover:bg-ink-3 lg:col-span-4"
          >
            <span className="font-data text-[11px] font-medium uppercase tracking-[0.14em] text-dim">
              Live
            </span>
            <h3 className="font-sans text-[1.1875rem] font-semibold leading-[1.35] text-paper">
              Findings wire
            </h3>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap font-data text-[12.5px] text-dim">
                <span className="shrink-0 rounded-[2px] border border-sev-high/35 bg-sev-high/10 px-[7px] py-[2px] font-data text-[11px] font-medium tracking-[0.1em] text-sev-high">
                  HIGH
                </span>
                adminMoveAlpha accounting desync…
              </div>
              <div className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap font-data text-[12.5px] text-dim">
                <span className="shrink-0 rounded-[2px] border border-sev-med/35 bg-sev-med/10 px-[7px] py-[2px] font-data text-[11px] font-medium tracking-[0.1em] text-sev-med">
                  MED
                </span>
                depositAlpha two-phase not atomic…
              </div>
            </div>
          </motion.article>

          {/* Severity taxonomy */}
          <motion.article
            {...REVEAL}
            transition={{ duration: 0.5, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="d-rim flex flex-col gap-3 rounded-md border border-rule bg-ink-2 p-[26px] transition-colors hover:border-rule-strong hover:bg-ink-3 lg:col-span-4"
          >
            <span className="font-data text-[11px] font-medium uppercase tracking-[0.14em] text-dim">
              Taxonomy
            </span>
            <h3 className="font-sans text-[1.1875rem] font-semibold leading-[1.35] text-paper">
              Severity, scored honestly
            </h3>
            <div className="flex flex-wrap gap-1.5">
              <span className="rounded-[2px] border border-sev-crit-text/35 bg-sev-crit/10 px-[7px] py-[2px] font-data text-[11px] font-medium tracking-[0.1em] text-sev-crit-text">
                CRIT
              </span>
              <span className="rounded-[2px] border border-sev-high/35 bg-sev-high/10 px-[7px] py-[2px] font-data text-[11px] font-medium tracking-[0.1em] text-sev-high">
                HIGH
              </span>
              <span className="rounded-[2px] border border-sev-med/35 bg-sev-med/10 px-[7px] py-[2px] font-data text-[11px] font-medium tracking-[0.1em] text-sev-med">
                MED
              </span>
              <span className="rounded-[2px] border border-sev-low-text/35 bg-sev-low/10 px-[7px] py-[2px] font-data text-[11px] font-medium tracking-[0.1em] text-sev-low-text">
                LOW
              </span>
              <span className="rounded-[2px] border border-rule-strong px-[7px] py-[2px] font-data text-[11px] font-medium tracking-[0.1em] text-dim">
                INFO
              </span>
            </div>
          </motion.article>
        </div>
      </div>
    </section>
  );
}
