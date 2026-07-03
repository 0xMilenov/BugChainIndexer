"use client";

import { motion } from "framer-motion";

/**
 * The Dossier "File Header" — replaces the old centered SectionHeader.
 * Left-aligned mono section number + name, a rule that draws in on scroll,
 * a file reference at the far end, then a serif display heading and sub-copy.
 * Prop shape is a superset of the old SectionHeader so existing callers keep working.
 */
export function SectionHeader({
  eyebrow,
  title,
  sub,
  fileRef = "AAA/FR-2026",
}: {
  eyebrow: string;
  title: string;
  sub?: string;
  align?: "left" | "center";
  fileRef?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.6 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="mb-14 sm:mb-16"
    >
      <div className="mb-6 flex items-center gap-3.5">
        <span className="shrink-0 font-data text-[11.5px] font-medium uppercase tracking-[0.14em] text-blue-text">
          {eyebrow}
        </span>
        <motion.span
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="h-px flex-1 origin-left bg-rule"
        />
        <span className="hidden shrink-0 font-data text-[11px] tracking-[0.14em] text-ghost sm:inline">
          {fileRef}
        </span>
      </div>
      <h2 className="font-serif text-[clamp(2.5rem,4.5vw,3.75rem)] font-medium leading-[1.08] tracking-tight text-balance text-paper">
        {title}
      </h2>
      {sub && (
        <p className="mt-5 max-w-[52ch] text-[1.0625rem] leading-[1.7] text-body">
          {sub}
        </p>
      )}
    </motion.div>
  );
}
