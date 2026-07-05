"use client";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "primary" | "success" | "warning" | "muted";
  className?: string;
}

export function Badge({ children, variant = "muted", className = "" }: BadgeProps) {
  const variants = {
    primary: "border-blue-600/40 bg-blue-950 text-blue-300",
    success: "border-blue-600/35 bg-blue-950 text-blue-300",
    warning: "border-sev-med/40 bg-sev-med/10 text-sev-med",
    muted: "border-rule bg-ink-2 text-faint",
  };
  return (
    <span
      className={`inline-flex items-center rounded-[3px] border px-1.5 py-[2px] font-data text-[10px] font-medium uppercase tracking-[0.06em] ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
