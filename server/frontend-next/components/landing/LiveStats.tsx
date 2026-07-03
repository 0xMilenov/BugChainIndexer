"use client";

import { motion } from "framer-motion";
import { AnimatedCounter } from "./AnimatedCounter";
import { SectionHeader } from "./SectionHeader";
import type { LandingStats } from "@/lib/landing-types";

interface LiveStatsProps {
  stats: LandingStats;
}

const EASE = [0.16, 1, 0.3, 1] as const;

export function LiveStats({ stats }: LiveStatsProps) {
  const { audits, contracts } = stats;

  const severities = [
    {
      key: "crit",
      label: "CRIT",
      count: audits.critical,
      fill: "bg-sev-crit",
      labelColor: "text-sev-crit-text",
      countColor: "text-sev-crit-text font-medium",
      footMark: true,
    },
    {
      key: "high",
      label: "HIGH",
      count: audits.high,
      fill: "bg-sev-high",
      labelColor: "text-sev-high",
      countColor: "text-body",
      footMark: true,
    },
    {
      key: "med",
      label: "MED",
      count: audits.medium,
      fill: "bg-sev-med",
      labelColor: "text-sev-med",
      countColor: "text-body",
      footMark: false,
    },
    {
      key: "low",
      label: "LOW",
      count: audits.low,
      fill: "bg-sev-low",
      labelColor: "text-sev-low-text",
      countColor: "text-body",
      footMark: false,
    },
  ];

  const maxCount = Math.max(1, ...severities.map((s) => s.count));

  const instruments = [
    {
      key: "contracts",
      chip: "▤",
      label: "Contracts indexed",
      value: contracts.total,
      ctx: `across ${contracts.networks} EVM chains — Base first, streamed as they verify`,
    },
    {
      key: "audits",
      chip: "◎",
      label: "Audits completed",
      value: audits.total,
      ctx: "multi-agent · every one PoC-checked before filing",
    },
    {
      key: "networks",
      chip: "⬡",
      label: "Networks covered",
      value: contracts.networks,
      ctx: "base · ethereum · arbitrum · optimism · and more",
    },
  ];

  return (
    <section id="stats" className="relative border-t border-rule bg-ink-1 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeader
          eyebrow="01 ·· Coverage"
          title="What I've covered so far."
          sub="Every number is queried live from the same Postgres that powers my dashboard. No vanity metrics — this is the working file."
        />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Dominant panel — Findings on file */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="d-rim rounded-[14px] border border-rule bg-ink-2 px-8 py-9 transition-colors hover:border-rule-strong hover:bg-ink-3 sm:px-10 lg:col-span-7"
          >
            <span className="font-data text-xs font-medium uppercase tracking-[0.14em] text-faint">
              Findings on file
            </span>

            <div className="mt-3.5 font-data text-[clamp(2.5rem,4vw,3.5rem)] font-medium leading-none tracking-[-0.02em] text-paper d-tabular">
              <AnimatedCounter to={audits.findings} format={(n) => n.toLocaleString()} />
            </div>

            <div className="mt-7 grid gap-3.5" aria-label="Findings by severity">
              {severities.map((s, i) => (
                <div
                  key={s.key}
                  className="grid items-center gap-3.5"
                  style={{ gridTemplateColumns: "52px 1fr 64px" }}
                >
                  <span
                    className={`font-data text-[11.5px] tracking-[0.12em] ${s.labelColor}`}
                  >
                    {s.label}
                  </span>
                  <div className="d-groove h-2 overflow-hidden rounded-[2px]">
                    <motion.div
                      initial={{ scaleX: 0 }}
                      whileInView={{ scaleX: 1 }}
                      viewport={{ once: true, amount: 0.3 }}
                      transition={{ duration: 0.9, ease: EASE, delay: 0.1 + i * 0.1 }}
                      className={`h-full origin-left rounded-[2px] ${s.fill}`}
                      style={{ width: `${(s.count / maxCount) * 100}%` }}
                    />
                  </div>
                  <span
                    className={`text-right font-data text-sm d-tabular ${s.countColor}`}
                  >
                    {s.count}
                    {s.footMark && (
                      <span className="font-data text-faint">¹</span>
                    )}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-6 border-t border-rule-dot pt-4 font-sans text-[13px] leading-relaxed text-dim">
              <span className="font-data text-faint">¹</span> Every critical and high
              finding is PoC-verified before it&apos;s filed.
            </div>
          </motion.div>

          {/* Stacked instrument rows */}
          <div className="flex flex-col gap-4 lg:col-span-5">
            {instruments.map((inst, i) => (
              <motion.div
                key={inst.key}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, ease: EASE, delay: i * 0.08 }}
                className="d-rim flex flex-1 flex-col justify-center gap-2 rounded-md border border-rule bg-ink-2 px-6 py-5 transition-colors hover:border-rule-strong hover:bg-ink-3"
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 flex-none items-center justify-center rounded-[2px] border border-blue-600/20 bg-blue-950 font-data text-[13px] text-blue-400">
                    {inst.chip}
                  </span>
                  <span className="font-data text-xs font-medium uppercase tracking-[0.14em] text-faint">
                    {inst.label}
                  </span>
                </div>
                <div className="font-data text-[2.25rem] font-medium leading-tight tracking-[-0.02em] text-paper d-tabular">
                  <AnimatedCounter to={inst.value} format={(n) => n.toLocaleString()} />
                </div>
                <div className="text-[13.5px] font-medium leading-relaxed text-dim">
                  {inst.ctx}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
