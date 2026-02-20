"use client";

import { useCallback, useEffect, useState } from "react";
import { getNativePrices } from "@/lib/api";

export function useNativePrices() {
  const [prices, setPrices] = useState<Record<string, number>>({});

  const fetchPrices = useCallback(async () => {
    try {
      const res = await getNativePrices();
      setPrices(res?.prices || {});
    } catch (err) {
      console.warn("Failed to fetch native prices:", err);
    }
  }, []);

  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  return prices;
}
