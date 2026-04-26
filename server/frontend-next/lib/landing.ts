import "server-only";
import { headers } from "next/headers";
import type { LandingStats } from "./landing-types";

export type { LandingStats, LandingFinding, LandingRecentAudit } from "./landing-types";
export { formatCompactNumber, shortAddress } from "./landing-types";

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
 *
 * NOTE: do NOT import this module from a client component. Client modules
 * should import the type-only `lib/landing-types` instead.
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
