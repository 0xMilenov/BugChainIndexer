"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const reveal = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.3 },
  transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
};

const INDEX_LINKS: { id: string; label: string }[] = [
  { id: "#s00", label: "00 · Cover" },
  { id: "#coverage", label: "01 · Coverage" },
  { id: "#procedure", label: "02 · Procedure" },
  { id: "#capabilities", label: "03 · Capabilities" },
  { id: "#allocation", label: "04 · Allocation" },
  { id: "#findings", label: "05 · Findings" },
];

const GITHUB_HREF = "https://github.com/0xMilenov/BugChainIndexer";

export function LandingFooter() {
  return (
    <footer className="border-t border-rule bg-ink-1 px-6 pb-10 pt-16">
      <div className="mx-auto w-full max-w-[1152px]">
        <motion.div
          {...reveal}
          className="grid grid-cols-1 gap-10 md:grid-cols-12"
        >
          {/* Colophon */}
          <div className="md:col-span-5">
            <div className="flex items-center gap-2.5">
              <span
                className="d-breathe h-1.5 w-1.5 rounded-full bg-signal"
                aria-hidden="true"
              />
              <span className="font-serif text-[22px] font-[440] text-paper">
                AAA
              </span>
            </div>
            <p className="mt-2.5 max-w-[32ch] text-sm leading-relaxed text-dim">
              An autonomous whitehat. I audit Base, on my own.
            </p>
            <div className="mt-[18px]">
              <span className="inline-block rounded-[2px] border border-blue-600/35 bg-blue-950 px-[7px] py-0.5 font-data text-[11px] font-medium tracking-[0.1em] text-blue-300">
                FUNDED BY $AAA FEES
              </span>
            </div>
          </div>

          {/* Index */}
          <div className="md:col-span-3">
            <h5 className="mb-3.5 font-data text-[11px] font-medium uppercase tracking-[0.14em] text-faint">
              Index
            </h5>
            <ul className="flex flex-col gap-2.5">
              {INDEX_LINKS.map((link) => (
                <li key={link.id}>
                  <a
                    href={link.id}
                    className="font-data text-[12.5px] text-dim transition-colors hover:text-paper"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Record */}
          <div className="md:col-span-4">
            <h5 className="mb-3.5 font-data text-[11px] font-medium uppercase tracking-[0.14em] text-faint">
              Record
            </h5>
            <div className="flex flex-col gap-2.5 font-data text-[12.5px] text-dim">
              <a
                href={GITHUB_HREF}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-paper"
              >
                GitHub — open source ↗
              </a>
              <a
                href="https://basescan.org"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-paper"
              >
                Basescan ↗
              </a>
              <a
                href="https://x.com"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-paper"
              >
                X / Farcaster ↗
              </a>
              <span className="mt-2 text-dim">
                $AAA CONTRACT · 0x… (at launch)
              </span>
              <span className="font-sans text-[13px] leading-relaxed text-dim">
                Not financial advice.
              </span>
            </div>
          </div>
        </motion.div>

        <div className="mt-14 flex flex-wrap justify-between gap-4 border-t border-dotted border-rule-dot pt-5 font-data text-[11px] tracking-[0.08em] text-faint">
          <span>AAA/FR-2026 · BUILD a01e9ad</span>
          <Link href="/dashboard" className="transition-colors hover:text-paper">
            DASHBOARD ↗
          </Link>
        </div>
      </div>
    </footer>
  );
}
