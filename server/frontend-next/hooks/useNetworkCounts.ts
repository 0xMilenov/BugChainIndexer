"use client";

import { useCallback, useEffect, useState } from "react";
import { getNetworkCounts } from "@/lib/api";
import { NETWORK_KEYS } from "@/lib/constants";

export function useNetworkCounts() {
  const [counts, setCounts] = useState<Record<string, number>>({});

  const fetchCounts = useCallback(async (refresh = false) => {
    try {
      const res = await getNetworkCounts(refresh);
      const raw = res?.networks || {};
      const merged = Object.fromEntries([
        ...NETWORK_KEYS.map((k) => [k, 0]),
        ...Object.entries(raw),
      ]);
      setCounts(merged);
    } catch (err) {
      console.warn("Failed to fetch network counts:", err);
      setCounts(Object.fromEntries(NETWORK_KEYS.map((k) => [k, 0])));
    }
  }, []);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  return { counts, refresh: () => fetchCounts(true) };
}
