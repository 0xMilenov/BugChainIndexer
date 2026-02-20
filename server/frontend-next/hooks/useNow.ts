"use client";

import { useEffect, useState } from "react";

/**
 * Returns the current timestamp, updating at the given interval (ms).
 * Used for live elapsed time display.
 */
export function useNow(intervalMs: number = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
