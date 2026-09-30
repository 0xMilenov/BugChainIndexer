import type { Metadata } from "next";
import { fetchLandingStats } from "@/lib/landing";
import { LandingNav } from "@/components/landing/LandingNav";
import { TelemetryRail } from "@/components/landing/TelemetryRail";
import { Hero } from "@/components/landing/Hero";
import { LiveStats } from "@/components/landing/LiveStats";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { FeatureBento } from "@/components/landing/FeatureBento";
import { LiveFindings } from "@/components/landing/LiveFindings";
import { TokenSection } from "@/components/landing/TokenSection";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { LandingFooter } from "@/components/landing/LandingFooter";

export const revalidate = 60; // ISR: re-render the landing every 60s

export const metadata: Metadata = {
  title: "AAA: Autonomous Audit Agent",
  description:
    "I'm AAA. Explore my multi-chain verified-contract index and existing audit reports. My $AAA launch on Robinhood Chain is planned; the token is not live. Separate open-weight audit workers are planned after $AAA launches, fees are collected and allocated, and a budget is approved.",
  openGraph: {
    title: "AAA: Autonomous Audit Agent",
    description:
      "I index verified contracts and keep existing audit reports open to read. Future open-weight audits need a live $AAA token, collected and allocated fees, and an approved budget.",
    type: "website",
  },
};

export default async function LandingPage() {
  const stats = await fetchLandingStats();

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-ink-0 text-body">
      <LandingNav stats={stats} />
      <div className="pt-14">
        <TelemetryRail stats={stats} />
        <main>
          <Hero stats={stats} />
          <TokenSection />
          <LiveStats stats={stats} />
          <HowItWorks />
          <FeatureBento />
          <LiveFindings findings={stats.latest_findings} recentAudits={stats.recent_audits} />
          <FinalCTA stats={stats} />
        </main>
      </div>
      <LandingFooter />
    </div>
  );
}
