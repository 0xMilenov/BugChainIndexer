"use client";

import { useEffect, useState } from "react";
import { shortAddress, type LandingStats } from "@/lib/landing-types";

// A 36px always-live strip under the nav. Real data, cycling every 6s.
// The single cheapest proof that the agent is running right now.
function relativeTime(ts: number | null): string {
  if (!ts) return "—";
  const diff = Math.max(0, Math.floor(Date.now() / 1000 - ts));
  if (diff < 90) return `${diff}s ago`;
  if (diff < 5400) return `${Math.round(diff / 60)} min ago`;
  if (diff < 129600) return `${Math.round(diff / 3600)} h ago`;
  return `${Math.round(diff / 86400)} d ago`;
}

export function TelemetryRail({ stats }: { stats: LandingStats }) {
  const latest = stats.recent_audits[0] ?? null;
  const lines = [
    <>
      <span className="text-signal">● OPERATIONAL</span>&nbsp;&nbsp; INDEXED{" "}
      <b className="font-medium text-body">{stats.contracts.total.toLocaleString("en-US")}</b> CONTRACTS ·{" "}
      <b className="font-medium text-body">{stats.contracts.networks}</b> CHAINS &nbsp;·&nbsp; FINDINGS{" "}
      <b className="font-medium text-body">{stats.audits.findings.toLocaleString("en-US")}</b> ({stats.audits.critical} CRITICAL)
    </>,
    latest ? (
      <>
        <span className="text-signal">● OPERATIONAL</span>&nbsp;&nbsp; LAST AUDIT{" "}
        <b className="font-medium text-body">{latest.contract_name || shortAddress(latest.address)}</b> ·{" "}
        {latest.network} &nbsp;·&nbsp; {relativeTime(latest.completed_at)}
      </>
    ) : (
      <>
        <span className="text-signal">● OPERATIONAL</span>&nbsp;&nbsp;{" "}
        <b className="font-medium text-body">{stats.audits.total}</b> AUDITS COMPLETED
      </>
    ),
    <>
      <span className="text-signal">● OPERATIONAL</span>&nbsp;&nbsp;{" "}
      <b className="font-medium text-body">{stats.audits.total}</b> AUDITS ·{" "}
      <b className="font-medium text-body">{stats.audits.critical}</b> CRITICAL /{" "}
      <b className="font-medium text-body">{stats.audits.high}</b> HIGH ON FILE
    </>,
  ];

  const [i, setI] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setI((p) => (p + 1) % lines.length);
        setVisible(true);
      }, 480);
    }, 6000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-9 items-center overflow-hidden border-b border-rule bg-ink-1" role="status" aria-label="Live telemetry">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-2.5 px-6">
        <span className="h-1.5 w-1.5 shrink-0 rounded-[2px] bg-signal d-glow-signal d-breathe" aria-hidden />
        <span
          className="truncate font-data text-[11.5px] uppercase tracking-[0.1em] text-dim transition-opacity duration-500"
          style={{ opacity: visible ? 1 : 0 }}
        >
          {lines[i]}
        </span>
      </div>
    </div>
  );
}
