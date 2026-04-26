import type { Metadata } from "next";
import { fetchLandingStats } from "@/lib/landing";
import { LandingNav } from "@/components/landing/LandingNav";
import { Hero } from "@/components/landing/Hero";
import { LiveStats } from "@/components/landing/LiveStats";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { FeatureBento } from "@/components/landing/FeatureBento";
import { LiveFindings } from "@/components/landing/LiveFindings";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { LandingFooter } from "@/components/landing/LandingFooter";

export const revalidate = 60; // ISR: re-render the landing every 60s

export const metadata: Metadata = {
  title: "Visualisa — Autonomous Web3 Security Audits, Indexed",
  description:
    "Visualisa indexes verified contracts across 13 EVM chains and runs autonomous multi-agent security audits on demand. Severity-ranked findings, proof-of-concept verified, surfaced inline.",
  openGraph: {
    title: "Visualisa — Autonomous Web3 Security Audits",
    description:
      "Indexed contracts across 13 EVM chains with live multi-agent security audits.",
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
        <FinalCTA stats={stats} />
      </main>
      <LandingFooter />
    </div>
  );
}
