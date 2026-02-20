"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import {
  NETWORK_KEYS,
  NETWORK_DISPLAY_NAMES,
  FUND_UI_MAX,
} from "@/lib/constants";

export interface Filters {
  address: string;
  name: string;
  timeMin: number;
  timeMax: number;
  fundMin: number;
  fundMax: number;
  networks: string[];
}

const defaultFilters: Filters = {
  address: "",
  name: "",
  timeMin: 0,
  timeMax: 12,
  fundMin: 0,
  fundMax: FUND_UI_MAX,
  networks: [...NETWORK_KEYS],
};

interface FilterContextValue {
  filters: Filters;
  setAddress: (v: string) => void;
  setName: (v: string) => void;
  setTimeMin: (v: number) => void;
  setTimeMax: (v: number) => void;
  setFundMin: (v: number) => void;
  setFundMax: (v: number) => void;
  setNetworks: (v: string[]) => void;
  toggleNetwork: (n: string) => void;
  clearFilters: () => void;
  selectAllNetworks: () => void;
  clearAllNetworks: () => void;
  filterBadgeCount: number;
  networkButtonCount: number;
}

const FilterContext = createContext<FilterContextValue | null>(null);

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<Filters>(defaultFilters);

  const networkButtonCount = Object.keys(NETWORK_DISPLAY_NAMES).length;

  const filterBadgeCount = useMemo(() => {
    let count = 0;
    if (filters.address) count++;
    if (filters.name) count++;
    if (filters.timeMin !== 0 || filters.timeMax !== 12) count++;
    if (filters.fundMin !== 0 || filters.fundMax !== FUND_UI_MAX) count++;
    if (
      filters.networks.length > 0 &&
      filters.networks.length < networkButtonCount
    )
      count++;
    return count;
  }, [filters, networkButtonCount]);

  const setAddress = useCallback((v: string) => {
    setFilters((prev) => ({ ...prev, address: v }));
  }, []);
  const setName = useCallback((v: string) => {
    setFilters((prev) => ({ ...prev, name: v }));
  }, []);
  const setTimeMin = useCallback((v: number) => {
    setFilters((prev) => ({ ...prev, timeMin: v }));
  }, []);
  const setTimeMax = useCallback((v: number) => {
    setFilters((prev) => ({ ...prev, timeMax: v }));
  }, []);
  const setFundMin = useCallback((v: number) => {
    setFilters((prev) => ({ ...prev, fundMin: v }));
  }, []);
  const setFundMax = useCallback((v: number) => {
    setFilters((prev) => ({ ...prev, fundMax: v }));
  }, []);
  const setNetworks = useCallback((v: string[]) => {
    setFilters((prev) => ({ ...prev, networks: v }));
  }, []);
  const toggleNetwork = useCallback((n: string) => {
    setFilters((prev) => {
      const has = prev.networks.includes(n);
      const next = has
        ? prev.networks.filter((x) => x !== n)
        : [...prev.networks, n];
      return { ...prev, networks: next };
    });
  }, []);
  const clearFilters = useCallback(() => {
    setFilters({
      ...defaultFilters,
      networks: [...NETWORK_KEYS],
    });
  }, []);
  const selectAllNetworks = useCallback(() => {
    setFilters((prev) => ({ ...prev, networks: [...NETWORK_KEYS] }));
  }, []);
  const clearAllNetworks = useCallback(() => {
    setFilters((prev) => ({ ...prev, networks: [] }));
  }, []);

  useEffect(() => {
    const address = searchParams.get("address");
    const name = searchParams.get("name");
    const timeMin = searchParams.get("timeMin");
    const timeMax = searchParams.get("timeMax");
    const fundMin = searchParams.get("fundMin");
    const fundMax = searchParams.get("fundMax");
    const networks = searchParams.get("networks");

    if (
      address !== null ||
      name !== null ||
      timeMin !== null ||
      timeMax !== null ||
      fundMin !== null ||
      fundMax !== null ||
      networks !== null
    ) {
      setFilters((prev) => ({
        ...prev,
        address: address ?? prev.address,
        name: name ?? prev.name,
        timeMin: timeMin !== null ? parseInt(timeMin, 10) : prev.timeMin,
        timeMax: timeMax !== null ? parseInt(timeMax, 10) : prev.timeMax,
        fundMin: fundMin !== null ? parseInt(fundMin, 10) : prev.fundMin,
        fundMax: fundMax !== null ? parseInt(fundMax, 10) : prev.fundMax,
        networks: networks ? networks.split(",").filter(Boolean) : prev.networks,
      }));
    }
  }, [searchParams]);

  const value = useMemo<FilterContextValue>(
    () => ({
      filters,
      setAddress,
      setName,
      setTimeMin,
      setTimeMax,
      setFundMin,
      setFundMax,
      setNetworks,
      toggleNetwork,
      clearFilters,
      selectAllNetworks,
      clearAllNetworks,
      filterBadgeCount,
      networkButtonCount,
    }),
    [
      filters,
      setAddress,
      setName,
      setTimeMin,
      setTimeMax,
      setFundMin,
      setFundMax,
      setNetworks,
      toggleNetwork,
      clearFilters,
      selectAllNetworks,
      clearAllNetworks,
      filterBadgeCount,
      networkButtonCount,
    ]
  );

  return (
    <FilterContext.Provider value={value}>{children}</FilterContext.Provider>
  );
}

export function useFilters() {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error("useFilters must be used within FilterProvider");
  return ctx;
}
