"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, AlertOctagon, Flame } from "lucide-react";
import { SectionHeader } from "./LiveStats";
import { shortAddress, type LandingFinding, type LandingRecentAudit } from "@/lib/landing";

interface LiveFindingsProps {
  findings: LandingFinding[];
  recentAudits: LandingRecentAudit[];
}

export function LiveFindings({ findings, recentAudits }: LiveFindingsProps) {
  // Duplicate the findings for an infinite-scroll marquee feel.
  const ticker = findings.length > 0 ? [...findings, ...findings] : [];

  return (
    <section id="findings" className="relative border-t border-border/40 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeader
          eyebrow="Live findings"
          title="Real bugs from real audits."
          sub="Every finding below is sourced directly from contract_audit_findings — no marketing fluff, no manufactured screenshots."
        />

        {/* Marquee ticker */}
        {ticker.length > 0 && (
          <div className="relative mt-16 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
            <div className="flex w-max gap-3 animate-marquee">
              {ticker.map((f, i) => (
                <FindingChip key={i} finding={f} />
              ))}
            </div>
          </div>
        )}

        {/* Recent audits grid */}
        {recentAudits.length > 0 && (
          <div className="mt-16">
            <div className="mb-6 flex items-end justify-between">
              <h3 className="text-lg font-semibold tracking-tight text-text-primary">
                Recently audited
              </h3>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1 text-sm text-text-muted transition hover:text-accent"
              >
                See all
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {recentAudits.slice(0, 8).map((a, i) => (
                <RecentAuditCard key={`${a.network}-${a.address}`} audit={a} index={i} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function FindingChip({ finding }: { finding: LandingFinding }) {
  const isCrit = finding.severity === "critical";
  const Icon = isCrit ? Flame : AlertOctagon;
  const tone = isCrit
    ? "border-red-500/40 bg-red-500/10 text-red-300"
    : "border-amber-500/40 bg-amber-500/10 text-amber-300";

  return (
    <Link
      href={`/contract/${finding.network}/${finding.address}`}
      className={`flex w-[28rem] shrink-0 items-center gap-3 rounded-xl border ${tone} px-4 py-3 backdrop-blur transition hover:scale-[1.02]`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-text-primary">
          {finding.title}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-text-muted">
          <span>{finding.network}</span>
          <span>·</span>
          <span>{finding.contract_name || shortAddress(finding.address)}</span>
        </div>
      </div>
      <ArrowUpRight className="h-3 w-3 shrink-0 opacity-50" />
    </Link>
  );
}

function RecentAuditCard({
  audit,
  index,
}: {
  audit: LandingRecentAudit;
  index: number;
}) {
  const total = audit.critical + audit.high + audit.medium;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.5, delay: index * 0.06 }}
    >
      <Link
        href={`/contract/${audit.network}/${audit.address}`}
        className="group block rounded-xl border border-border/60 bg-bg-secondary/40 p-4 backdrop-blur transition hover:border-border hover:bg-bg-secondary/70"
      >
        <div className="flex items-center justify-between">
          <div className="font-mono text-xs uppercase tracking-wider text-text-muted">
            {audit.network}
          </div>
          <ArrowUpRight className="h-3 w-3 text-text-muted transition group-hover:text-accent" />
        </div>
        <div className="mt-2 truncate text-sm font-medium text-text-primary">
          {audit.contract_name || shortAddress(audit.address, 6)}
        </div>
        <div className="mt-1 truncate font-mono text-[11px] text-text-muted">
          {shortAddress(audit.address, 6)}
        </div>
        <div className="mt-3 flex items-center gap-1.5">
          <SeverityPill count={audit.critical} severity="critical" />
          <SeverityPill count={audit.high} severity="high" />
          <SeverityPill count={audit.medium} severity="medium" />
          <span className="ml-auto text-[11px] text-text-muted">
            {total} {total === 1 ? "finding" : "findings"}
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

function SeverityPill({
  count,
  severity,
}: {
  count: number;
  severity: "critical" | "high" | "medium";
}) {
  const color = {
    critical: count > 0 ? "border-red-500/40 bg-red-500/10 text-red-300" : "border-border/40 text-text-muted/40",
    high: count > 0 ? "border-orange-500/40 bg-orange-500/10 text-orange-300" : "border-border/40 text-text-muted/40",
    medium: count > 0 ? "border-amber-500/40 bg-amber-500/10 text-amber-300" : "border-border/40 text-text-muted/40",
  }[severity];
  const letter = severity[0].toUpperCase();
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold ${color}`}
    >
      <span>{count}</span>
      <span>{letter}</span>
    </span>
  );
}
