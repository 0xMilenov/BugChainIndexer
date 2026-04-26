"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useMotionValue, useSpring, useTransform } from "framer-motion";

interface AnimatedCounterProps {
  to: number;
  durationMs?: number;
  format?: (n: number) => string;
  className?: string;
  suffix?: string;
  prefix?: string;
}

/**
 * Counts up from 0 to `to` once, only when scrolled into view. Uses framer
 * spring physics so the easing matches the rest of the landing's motion.
 */
export function AnimatedCounter({
  to,
  durationMs = 1800,
  format,
  className = "",
  suffix = "",
  prefix = "",
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const inView = useInView(ref, { amount: 0.5, once: true });
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, {
    stiffness: 60,
    damping: 24,
    mass: 1,
    duration: durationMs,
  });
  const display = useTransform(spring, (latest) => {
    const v = Math.round(latest);
    return (format ? format(v) : v.toLocaleString());
  });
  const [text, setText] = useState(format ? format(0) : "0");

  useEffect(() => {
    if (inView) motionValue.set(to);
  }, [inView, to, motionValue]);

  useEffect(() => {
    const unsub = display.on("change", (v) => setText(String(v)));
    return () => unsub();
  }, [display]);

  return (
    <span ref={ref} className={className} suppressHydrationWarning>
      {prefix}
      {text}
      {suffix}
    </span>
  );
}
