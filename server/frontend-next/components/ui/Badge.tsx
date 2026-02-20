"use client";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "primary" | "success" | "warning" | "muted";
  className?: string;
}

export function Badge({ children, variant = "muted", className = "" }: BadgeProps) {
  const variants = {
    primary: "bg-accent/20 text-accent border-accent/40",
    success: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
    warning: "bg-accent-amber/20 text-accent-amber border-accent-amber/40",
    muted: "bg-bg-tertiary text-text-muted border-border",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
