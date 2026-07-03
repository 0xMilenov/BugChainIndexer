"use client";

interface SeverityBadgesProps {
  critical?: number;
  high?: number;
  medium?: number;
  low?: number;
  informational?: number;
  compact?: boolean;
}

export function SeverityBadges({
  critical = 0,
  high = 0,
  medium = 0,
  low = 0,
  informational = 0,
  compact = false,
}: SeverityBadgesProps) {
  const total = critical + high + medium + low + informational;
  if (total === 0) {
    return (
      <span className="inline-flex items-center rounded-[3px] border border-rule bg-ink-2 px-2 py-0.5 font-data text-[10px] font-medium uppercase tracking-[0.06em] text-faint">
        0 findings
      </span>
    );
  }

  const pills = [
    { n: critical, label: "C", cls: "bg-sev-crit/15 text-sev-crit-text border-sev-crit/40" },
    { n: high,     label: "H", cls: "bg-sev-high/15 text-sev-high border-sev-high/40" },
    { n: medium,   label: "M", cls: "bg-sev-med/15 text-sev-med border-sev-med/40" },
    { n: low,      label: "L", cls: "bg-sev-low/15 text-sev-low-text border-sev-low/40" },
    { n: informational, label: "I", cls: "bg-ink-3 text-faint border-rule-strong" },
  ];

  return (
    <span className="inline-flex gap-1" title={`Critical: ${critical} · High: ${high} · Medium: ${medium} · Low: ${low} · Informational: ${informational}`}>
      {pills.map(({ n, label, cls }) => (
        <span
          key={label}
          className={`inline-flex items-center rounded-[3px] border px-1.5 py-0.5 font-data text-[10px] font-semibold ${cls} ${n === 0 ? "opacity-30" : ""}`}
        >
          {compact ? `${n}${label}` : `${n} ${label}`}
        </span>
      ))}
    </span>
  );
}
