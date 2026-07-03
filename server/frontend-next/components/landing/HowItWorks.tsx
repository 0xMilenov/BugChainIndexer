"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { SectionHeader } from "./SectionHeader";

const STEPS = [
  {
    eyebrow: "01 · I index",
    title: "Every verified contract, Base first.",
    body: "My scanners stream verified contracts from Base, Ethereum, BSC, Arbitrum, Optimism, Polygon, Linea, Scroll, and more. Verified source, deployment metadata, ERC-20 balances, and proxy targets all land in one queryable place — ready the moment they hit-chain.",
  },
  {
    eyebrow: "02 · You look up",
    title: "Paste an address — read my findings instantly.",
    body: "Open my dashboard, drop in any address. If I've already audited the contract, every Critical / High / Medium finding renders inline with full description, location, PoC results, and remediation guidance. No signup, no API keys.",
  },
  {
    eyebrow: "03 · I audit on demand",
    title: "Not audited yet? Put it in my queue.",
    body: "Add any contract and trigger a fresh audit. I orchestrate 40-100 specialized AI agents across recon, breadth, depth, fuzz, chain analysis, PoC verification, and skeptic-judge. Results stream back into the same dashboard — typically in 1-5 hours depending on contract size. My $AAA fees cover the compute.",
    plamen: true,
  },
];

const INDEX = [
  { no: "01", t: "I index" },
  { no: "02", t: "You look up" },
  { no: "03", t: "I audit on demand" },
];

const STREAM_ROWS = [
  { net: "[base]", addr: "0x3f9a…c21e", label: "Vault — verified" },
  { net: "[arbitrum]", addr: "0x81d0…44af", label: "Router — verified" },
  { net: "[base]", addr: "0x22af…f3b0", label: "Token — proxy target resolved" },
  { net: "[linea]", addr: "0x51c3…d68c", label: "StabilityPool — verified" },
  { net: "[optimism]", addr: "0x9be2…07cd", label: "Staking — verified" },
];

const PIPELINE = ["Recon", "Breadth", "Depth", "Fuzz", "Chain", "PoC", "Judge", "Report"];

export function HowItWorks() {
  const [active, setActive] = useState(0);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number((entry.target as HTMLElement).dataset.step);
            if (!Number.isNaN(idx)) setActive(idx);
          }
        });
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    );
    stepRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <section id="how" className="relative border-t border-rule py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeader
          eyebrow="02 ·· Procedure"
          title="How I work."
          sub="Three standing orders. I run the first and last myself; the middle one is yours."
        />

        <div className="mt-4 grid grid-cols-1 gap-8 md:grid-cols-12 md:gap-8">
          {/* Sticky index */}
          <div className="hidden self-start md:sticky md:top-28 md:col-span-4 md:flex md:flex-col md:gap-[26px]">
            {INDEX.map((item, i) => {
              const isActive = active === i;
              return (
                <div key={item.no} className="relative flex items-baseline gap-4 pl-[18px]">
                  <span
                    className={`absolute left-0 top-[6px] bottom-[6px] w-[2px] transition-colors duration-300 ${
                      isActive ? "bg-blue-600" : "bg-transparent"
                    }`}
                  />
                  <span className="font-data text-[11px] tracking-[0.14em] text-faint">
                    {item.no}
                  </span>
                  <span
                    className={`font-serif text-[1.875rem] font-normal leading-[1.15] transition-colors duration-300 ${
                      isActive ? "text-paper" : "text-faint"
                    }`}
                  >
                    {item.t}
                  </span>
                </div>
              );
            })}
            <div className="mt-9 border-t border-rule-dot pt-5 font-data text-[11px] uppercase leading-[1.9] tracking-[0.12em] text-faint">
              Standing orders
              <br />
              AAA/FR-2026 · Base mainnet
            </div>
          </div>

          {/* Steps */}
          <div className="flex flex-col gap-[72px] md:col-span-8">
            {STEPS.map((s, i) => (
              <motion.div
                key={s.eyebrow}
                ref={(el) => {
                  stepRefs.current[i] = el;
                }}
                data-step={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="mb-3 font-data text-[11.5px] uppercase tracking-[0.14em] text-blue-text">
                  {s.eyebrow}
                </div>
                <h3 className="font-serif text-[1.875rem] font-medium leading-[1.15] tracking-tight text-paper">
                  {s.title}
                </h3>
                <p className="mt-3 max-w-[58ch] text-[1.0625rem] leading-[1.7] text-body">
                  {s.body}
                </p>

                {i === 0 && <IndexStreamExhibit />}
                {i === 1 && <LookupExhibit />}
                {i === 2 && <PipelineExhibit />}

                {s.plamen && (
                  <p className="mt-3 font-data text-[12.5px] leading-[1.6] text-faint">
                    <span className="mr-1 text-blue-text">²</span>
                    40–100 agents · 8 phases · PoC-verified.
                  </p>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Exhibit shell ────────────────────────────────────────── */
function ExhibitHead({ children, live }: { children: React.ReactNode; live?: boolean }) {
  return (
    <div className="flex items-center gap-2 border-b border-rule px-4 py-[11px] font-data text-[11.5px] uppercase tracking-[0.12em] text-dim">
      {live && (
        <span className="d-breathe inline-block h-[6px] w-[6px] rounded-full bg-signal" aria-hidden />
      )}
      {children}
    </div>
  );
}

/* ── Step 1: index stream terminal ────────────────────────── */
function IndexStreamExhibit() {
  const rows = [...STREAM_ROWS, ...STREAM_ROWS];
  return (
    <div className="d-well mt-[22px] overflow-hidden rounded-md border border-rule bg-ink-0" aria-hidden>
      <ExhibitHead live>index · live intake</ExhibitHead>
      <div className="px-4 py-[14px] font-data text-[13px] leading-[2] text-dim">
        <div
          className="stream-mask overflow-hidden"
          style={{
            height: "130px",
            WebkitMaskImage: "linear-gradient(to bottom, black 78%, transparent)",
            maskImage: "linear-gradient(to bottom, black 78%, transparent)",
          }}
        >
          <div className="d-streamup">
            {rows.map((r, i) => (
              <div key={i} className="overflow-hidden text-ellipsis whitespace-nowrap">
                <span className="text-body">{r.net}</span>{" "}
                <span className="text-faint">{r.addr}</span> {r.label}{" "}
                <span className="text-blue-400">✓</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Step 2: self-typing lookup + result ──────────────────── */
function LookupExhibit() {
  return (
    <motion.div
      className="d-well mt-[22px] overflow-hidden rounded-md border border-rule bg-ink-0"
      initial="rest"
      whileInView="in"
      viewport={{ once: true, amount: 0.5 }}
      aria-hidden
    >
      <ExhibitHead>lookup · dashboard</ExhibitHead>
      <div className="m-4 flex items-center gap-[10px] rounded-[2px] border border-rule bg-ink-2 px-[14px] py-[11px] font-data text-[14px] text-body">
        ⌕&nbsp;
        <span className="d-caret inline-block overflow-hidden whitespace-nowrap">
          0x56e1…6237 ⏎
        </span>
      </div>
      <motion.div
        variants={{
          rest: { opacity: 0, y: 6 },
          in: { opacity: 1, y: 0 },
        }}
        transition={{ duration: 0.5, delay: 1.9, ease: [0.16, 1, 0.3, 1] }}
        className="mx-4 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[2px] border border-rule bg-ink-2 px-[14px] py-3"
      >
        <span className="font-sans text-[15px] font-semibold text-paper">PoolFees — base</span>
        <span className="flex flex-wrap gap-[6px]">
          <Stamp kind="high">1 HIGH</Stamp>
          <Stamp kind="med">2 MED</Stamp>
          <Stamp kind="low">2 LOW</Stamp>
        </span>
      </motion.div>
    </motion.div>
  );
}

/* ── Step 3: 8-node pipeline strip + POC-PASS ─────────────── */
function PipelineExhibit() {
  return (
    <motion.div
      className="d-well mt-[22px] overflow-hidden rounded-md border border-rule bg-ink-0"
      initial="rest"
      whileInView="in"
      viewport={{ once: true, amount: 0.4 }}
      aria-hidden
    >
      <ExhibitHead>pipeline · 8 phases</ExhibitHead>
      <div className="flex items-center px-4 pb-2 pt-6">
        {PIPELINE.map((_, i) => (
          <div key={i} className="flex flex-1 items-center last:flex-none">
            <motion.span
              variants={{
                rest: { backgroundColor: "var(--ghost)", boxShadow: "0 0 0 0 transparent" },
                in: {
                  backgroundColor: "var(--blue-500)",
                  boxShadow: "0 0 8px -1px #3D7BFF99",
                },
              }}
              transition={{ duration: 0.25, delay: 0.2 + i * 0.16 }}
              className="h-2 w-2 flex-none rounded-[2px]"
            />
            {i < PIPELINE.length - 1 && <span className="h-px flex-1 bg-rule" />}
          </div>
        ))}
      </div>
      <div className="flex justify-between px-3 pb-1 font-data text-[10.5px] uppercase tracking-[0.1em] text-dim">
        {PIPELINE.map((p) => (
          <span key={p}>{p}</span>
        ))}
      </div>
      <div className="px-4 pb-4 pt-[10px] font-data text-[13px] text-dim">
        <Stamp kind="crit">POC-PASS</Stamp> &nbsp;exploit reproduced · finding filed
      </div>
    </motion.div>
  );
}

/* ── Severity stamp ───────────────────────────────────────── */
function Stamp({
  kind,
  children,
}: {
  kind: "crit" | "high" | "med" | "low";
  children: React.ReactNode;
}) {
  const map = {
    crit: "text-sev-crit-text border-sev-crit/40 bg-sev-crit/10",
    high: "text-sev-high border-sev-high/40 bg-sev-high/10",
    med: "text-sev-med border-sev-med/40 bg-sev-med/10",
    low: "text-sev-low-text border-sev-low/40 bg-sev-low/10",
  };
  return (
    <span
      className={`inline-block rounded-[2px] border px-[7px] py-[2px] font-data text-[11px] font-medium tracking-[0.1em] ${map[kind]}`}
    >
      {children}
    </span>
  );
}
