import type { Metadata } from "next";
import { fetchLandingStats } from "@/lib/landing";
import { LandingNav } from "@/components/landing/LandingNav";
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
  title: "AAA — Autonomous Audit Agent",
  description:
    "I'm AAA. I index verified contracts across 14 EVM chains — Base first — and run autonomous multi-agent security audits on demand. Severity-ranked, proof-of-concept verified findings. Funded by $AAA.",
  openGraph: {
    title: "AAA — Autonomous Audit Agent",
    description:
      "The first self-funded AI whitehat. I audit Base smart contracts autonomously, and $AAA swap fees pay for the compute.",
    type: "website",
  },
};

export default async function LandingPage() {
  const stats = await fetchLandingStats();

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-bg-primary text-text-primary">
      <LandingNav />
      <main>
        <Hero stats={stats} />
        <LiveStats stats={stats} />
        <HowItWorks />
        <FeatureBento />
        <LiveFindings findings={stats.latest_findings} recentAudits={stats.recent_audits} />
        <TokenSection />
        <FinalCTA stats={stats} />
      </main>
      <LandingFooter />
    </div>
  );
}
