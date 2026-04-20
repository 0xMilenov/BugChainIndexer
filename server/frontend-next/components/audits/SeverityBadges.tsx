"use client";

interface SeverityBadgesProps {
  critical?: number;
  high?: number;
  medium?: number;
  compact?: boolean;
}

export function SeverityBadges({
  critical = 0,
  high = 0,
  medium = 0,
  compact = false,
}: SeverityBadgesProps) {
  const total = critical + high + medium;
  if (total === 0) {
    return (
      <span className="inline-flex items-center rounded-full border border-border bg-bg-tertiary px-2 py-0.5 text-[10px] font-medium text-text-muted">
        No audit
      </span>
    );
  }

  const pills = [
    { n: critical, label: "C", cls: "bg-red-500/15 text-red-400 border-red-500/40" },
    { n: high,     label: "H", cls: "bg-orange-500/15 text-orange-400 border-orange-500/40" },
    { n: medium,   label: "M", cls: "bg-amber-500/15 text-amber-400 border-amber-500/40" },
  ];

  return (
    <span className="inline-flex gap-1" title={`Critical: ${critical} · High: ${high} · Medium: ${medium}`}>
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
