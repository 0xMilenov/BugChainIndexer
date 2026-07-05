"use client";

import { motion } from "framer-motion";

/**
 * Section header: a plainly-named topic label, a rule that draws in on scroll,
 * then a serif display heading and sub-copy. The label names the topic; it does
 * not enumerate it.
 * Prop shape is a superset of the old SectionHeader so existing callers keep working.
 */
export function SectionHeader({
  eyebrow,
  title,
  sub,
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
      <div className="mb-6 flex items-center gap-4">
        <span className="shrink-0 font-data text-[11.5px] font-medium uppercase tracking-[0.16em] text-blue-text">
          {eyebrow}
        </span>
        <motion.span
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="h-px flex-1 origin-left bg-rule"
        />
      </div>
      <h2 className="font-serif text-[clamp(2.5rem,4.5vw,3.75rem)] font-medium leading-[1.08] tracking-tight text-balance text-paper">
        {title}
      </h2>
      {sub && (
        <p className="mt-5 max-w-[54ch] text-[1.0625rem] leading-[1.7] text-body">
          {sub}
        </p>
      )}
    </motion.div>
  );
}
