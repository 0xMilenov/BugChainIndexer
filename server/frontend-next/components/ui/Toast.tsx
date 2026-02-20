"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { ToastItem, ToastType } from "@/hooks/useToast";

interface ToastProps {
  toasts: ToastItem[];
}

const toneMap: Record<ToastType, string> = {
  success: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
  error: "border-red-500/40 bg-red-500/10 text-red-400",
  info: "border-accent/30 bg-bg-secondary text-text-primary",
};

export function Toast({ toasts }: ToastProps) {
  return (
    <div
      className="fixed right-4 top-4 z-50 flex max-w-sm flex-col gap-2 pointer-events-none"
      aria-live="polite"
      aria-atomic="true"
    >
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className={`rounded-lg border px-3 py-2 text-sm shadow-lg ${toneMap[t.type]}`}
          >
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
