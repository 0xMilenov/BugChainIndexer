import { headers } from "next/headers";

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

const FALLBACK: LandingStats = {
  contracts: { total: 0, verified: 0, networks: 0 },
  audits: { total: 0, critical: 0, high: 0, medium: 0, findings: 0 },
  latest_findings: [],
  recent_audits: [],
  generated_at: 0,
};

/**
 * Server-side stats fetch for the landing page. Uses absolute URL via the
 * incoming request headers so it works behind any host/proxy. Falls back to
 * zero counters on error so the page still renders even if the backend is
 * temporarily down.
 */
export async function fetchLandingStats(): Promise<LandingStats> {
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") || h.get("host");
    const proto = h.get("x-forwarded-proto") || "http";
    const base = host ? `${proto}://${host}` : "";
    const url = `${base}/landingStats`;
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!json?.ok) throw new Error("not ok");
    return {
      contracts: json.contracts || FALLBACK.contracts,
      audits: json.audits || FALLBACK.audits,
      latest_findings: Array.isArray(json.latest_findings) ? json.latest_findings : [],
      recent_audits: Array.isArray(json.recent_audits) ? json.recent_audits : [],
      generated_at: typeof json.generated_at === "number" ? json.generated_at : Date.now(),
    };
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.error("fetchLandingStats failed:", err);
    }
    return FALLBACK;
  }
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
