// Pure types + format helpers — safe to import from both server and client
// components. The actual server-side stats fetcher (which uses next/headers)
// lives in lib/landing.ts and must NOT be imported from client modules.

export interface LandingFinding {
  severity: "critical" | "high" | "medium" | "low" | "informational";
  title: string;
  location: string | null;
  address: string;
  network: string;
  contract_name: string | null;
  completed_at: number | null;
}

export interface LandingRecentAudit {
  address: string;
  network: string;
  contract_name: string | null;
  critical: number;
  high: number;
  medium: number;
  completed_at: number | null;
}

export interface LandingStats {
  contracts: { total: number; verified: number; networks: number };
  audits: { total: number; critical: number; high: number; medium: number; findings: number };
  latest_findings: LandingFinding[];
  recent_audits: LandingRecentAudit[];
  generated_at: number;
}

export function formatCompactNumber(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(n >= 10_000 ? 0 : 1) + "k";
  return String(n);
}

export function shortAddress(addr: string, chars = 4): string {
  if (!addr || addr.length < 2 + chars * 2) return addr || "";
  return `${addr.slice(0, 2 + chars)}…${addr.slice(-chars)}`;
}
