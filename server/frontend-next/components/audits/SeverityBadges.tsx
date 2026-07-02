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
      <span className="inline-flex items-center rounded-full border border-border bg-bg-tertiary px-2 py-0.5 text-[10px] font-medium text-text-muted">
        0 findings
      </span>
    );
  }

  const pills = [
    { n: critical, label: "C", cls: "bg-red-500/15 text-red-400 border-red-500/40" },
    { n: high,     label: "H", cls: "bg-orange-500/15 text-orange-400 border-orange-500/40" },
    { n: medium,   label: "M", cls: "bg-amber-500/15 text-amber-400 border-amber-500/40" },
    { n: low,      label: "L", cls: "bg-sky-500/15 text-sky-400 border-sky-500/40" },
    { n: informational, label: "I", cls: "bg-zinc-500/15 text-zinc-400 border-zinc-500/40" },
  ];

  return (
    <span className="inline-flex gap-1" title={`Critical: ${critical} · High: ${high} · Medium: ${medium} · Low: ${low} · Informational: ${informational}`}>
      {pills.map(({ n, label, cls }) => (
        <span
          key={label}
          className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${cls} ${n === 0 ? "opacity-30" : ""}`}
        >
          {compact ? `${n}${label}` : `${n} ${label}`}
        </span>
      ))}
    </span>
  );
}
