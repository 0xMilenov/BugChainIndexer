"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { SectionHeader } from "./SectionHeader";
import {
  shortAddress,
  type LandingFinding,
  type LandingRecentAudit,
} from "@/lib/landing-types";

interface LiveFindingsProps {
  findings: LandingFinding[];
  recentAudits: LandingRecentAudit[];
}

type Sev = "critical" | "high" | "medium" | "low" | "informational";

// Severity → 2px stamp box classes (full 5-tier).
const STAMP: Record<Sev, string> = {
  critical: "text-sev-crit-text border-sev-crit/35 bg-sev-crit/10",
  high: "text-sev-high border-sev-high/35 bg-sev-high/10",
  medium: "text-sev-med border-sev-med/35 bg-sev-med/10",
  low: "text-sev-low-text border-sev-low/35 bg-sev-low/10",
  informational: "text-dim border-rule-strong bg-transparent",
};

const STAMP_LABEL: Record<Sev, string> = {
  critical: "CRIT",
  high: "HIGH",
  medium: "MED",
  low: "LOW",
  informational: "INFO",
};

// Severity → bar-segment fill + spine background.
const SEV_FILL: Record<Sev, string> = {
  critical: "bg-sev-crit",
  high: "bg-sev-high",
  medium: "bg-sev-med",
  low: "bg-sev-low",
  informational: "bg-ghost",
};

const SEV_ORDER: Sev[] = ["critical", "high", "medium", "low", "informational"];

function relativeTime(ts: number | null): { label: string; fresh: boolean } {
  if (!ts) return { label: "-", fresh: false };
  const now = Date.now();
  const then = ts > 1e12 ? ts : ts * 1000;
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 60) {
    const m = Math.max(1, mins);
    return { label: `${m} min ago`, fresh: true };
  }
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return { label: `${hrs} h ago`, fresh: false };
  const days = Math.floor(hrs / 24);
  return { label: `${days} d ago`, fresh: false };
}

function findingTime(ts: number | null): string {
  if (!ts) return "--:--Z";
  const d = new Date(ts > 1e12 ? ts : ts * 1000);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}Z`;
}

export function LiveFindings({ findings, recentAudits }: LiveFindingsProps) {
  // Duplicate the list so the marquee loops seamlessly at translateX(-50%).
  const wire = findings.length > 0 ? [...findings, ...findings] : [];

  return (
    <section id="findings" className="relative bg-ink-0 pb-24 sm:pb-32">
      <div className="mx-auto h-[clamp(7rem,12vh,10rem)]" />

      <div className="mx-auto max-w-7xl px-6">
        <SectionHeader
          eyebrow="Findings"
          title="Real bugs, from real audits."
          sub="Sourced directly from contract_audit_findings, no marketing fluff, no manufactured screenshots."
        />
      </div>

      {/* (A) THE WIRE - full-bleed marquee */}
      {wire.length > 0 && (
        <div className="d-wirehost relative mb-[72px] overflow-hidden border-y border-rule bg-ink-1">
          {/* Fixed ● LIVE tag over a fade mask */}
          <span className="absolute inset-y-0 left-0 z-[2] flex items-center gap-2 bg-gradient-to-r from-ink-1 from-60% to-transparent pl-6 pr-5 font-data text-[11.5px] tracking-[0.14em] text-signal">
            <span className="block h-1.5 w-1.5 rounded-[1px] bg-signal d-glow-signal d-breathe" />
            LIVE
          </span>

          <div className="d-wire flex w-max items-center py-3.5">
            {wire.map((f, i) => {
              const sev = f.severity as Sev;
              return (
                <span key={i} className="flex items-center whitespace-nowrap">
                  <Link
                    href={`/contract/${f.network}/${f.address}`}
                    className="flex items-center gap-2.5 px-7 text-[14px] transition-opacity hover:opacity-100"
                  >
                    <span className="font-data text-[11.5px] text-signal">
                      {findingTime(f.completed_at)}
                    </span>
                    <span
                      className={`inline-block rounded-[2px] border px-1.5 py-px font-data text-[11px] font-medium tracking-[0.1em] ${STAMP[sev]}`}
                    >
                      {STAMP_LABEL[sev]}
                    </span>
                    <span className="font-medium text-body">{f.title}</span>
                    {f.location && (
                      <span className="font-data text-[12px] text-faint">
                        {f.location}
                      </span>
                    )}
                    <span className="font-data text-[11.5px] text-faint">
                      {shortAddress(f.address)} · {f.network}
                    </span>
                  </Link>
                  <span className="px-0.5 font-data text-ghost">·</span>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* (B) CASE FILES */}
      {recentAudits.length > 0 && (
        <div className="mx-auto max-w-7xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="mb-6 flex items-baseline justify-between"
          >
            <h3 className="font-serif text-[1.875rem] font-medium leading-tight text-paper">
              Recently on file.
            </h3>
            <Link
              href="/dashboard"
              className="border-b border-dotted border-rule-dot pb-0.5 font-data text-[13.5px] text-dim transition-colors hover:border-dim hover:text-body"
            >
              SEE ALL →
            </Link>
          </motion.div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-12">
            {recentAudits.slice(0, 7).map((a, i) => (
              <CaseCard
                key={`${a.network}-${a.address}`}
                audit={a}
                featured={i === 0}
                index={i}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function CaseCard({
  audit,
  featured,
  index,
}: {
  audit: LandingRecentAudit;
  featured: boolean;
  index: number;
}) {
  const counts: Record<Sev, number> = {
    critical: audit.critical,
    high: audit.high,
    medium: audit.medium,
    low: audit.low,
    informational: audit.informational,
  };
  const total =
    audit.critical + audit.high + audit.medium + audit.low + audit.informational;

  // Highest severity present → spine color.
  const highest = SEV_ORDER.find((s) => counts[s] > 0);
  const spineFill = highest ? SEV_FILL[highest] : "bg-ghost";

  // Segmented micro-bar - omit zero-count segments.
  const segments = SEV_ORDER.filter((s) => counts[s] > 0).map((s) => ({
    sev: s,
    pct: total > 0 ? (counts[s] / total) * 100 : 0,
  }));

  const rel = relativeTime(audit.completed_at);
  const name = audit.contract_name || shortAddress(audit.address, 6);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
      className={`${
        featured
          ? "md:col-span-2 lg:col-span-6 lg:row-span-2"
          : "lg:col-span-3"
      }`}
    >
      <Link
        href={`/contract/${audit.network}/${audit.address}`}
        className="group relative flex h-full flex-col gap-2.5 overflow-hidden rounded-md border border-rule bg-ink-2 py-4 pl-6 pr-5 d-rim transition-all duration-300 hover:-translate-y-[3px] hover:border-rule-strong d-rim-2"
      >
        {/* 3px left severity spine (grows on hover) */}
        <span
          className={`absolute inset-y-0 left-0 w-[3px] transition-all duration-300 group-hover:w-[5px] ${spineFill}`}
        />

        {/* Case id + relative time */}
        <div className="flex justify-between gap-2 font-data text-[11px] font-medium uppercase tracking-[0.12em] text-dim">
          <span className="truncate">
            Case · {audit.network}
            {featured ? ` ${shortAddress(audit.address)}` : ""}
          </span>
          <span
            className={`whitespace-nowrap font-normal normal-case tracking-[0.04em] ${
              rel.fresh ? "text-signal" : "text-faint"
            }`}
          >
            {rel.fresh ? "● " : ""}
            {rel.label}
          </span>
        </div>

        {/* Contract name */}
        <h4
          className={`font-sans font-semibold text-paper ${
            featured ? "text-[1.5rem]" : "text-[16px]"
          }`}
        >
          {name}
        </h4>

        <div className="font-data text-[11.5px] text-faint">
          {shortAddress(audit.address, 6)}
        </div>

        {featured && (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {SEV_ORDER.filter((s) => counts[s] > 0).map((s) => (
              <span
                key={s}
                className={`inline-block rounded-[2px] border px-1.5 py-px font-data text-[11px] font-medium tracking-[0.1em] ${STAMP[s]}`}
              >
                {counts[s]} {STAMP_LABEL[s]}
              </span>
            ))}
          </div>
        )}

        {/* Segmented severity micro-bar + total */}
        <div className="mt-auto flex flex-wrap items-center gap-2.5 pt-1">
          {total > 0 ? (
            <>
              <div className="flex h-[5px] min-w-[60px] flex-1 overflow-hidden rounded-[2px] d-groove">
                {segments.map((seg) => (
                  <motion.span
                    key={seg.sev}
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{
                      duration: 0.5,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    style={{ width: `${seg.pct}%` }}
                    className={`h-full origin-left ${SEV_FILL[seg.sev]}`}
                  />
                ))}
              </div>
              <span className="whitespace-nowrap font-data text-[11.5px] text-dim">
                {total} {total === 1 ? "finding" : "findings"}
              </span>
            </>
          ) : (
            <span className="font-data text-[11.5px] text-dim">
              clean: 0 findings
            </span>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
