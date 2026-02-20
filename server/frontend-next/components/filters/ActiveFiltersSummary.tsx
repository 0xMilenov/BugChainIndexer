"use client";

import { ListFilter } from "lucide-react";
import { useFilters } from "@/context/FilterContext";

interface ActiveFiltersSummaryProps {
  onClear?: () => void;
}
import { TIME_RANGES, FUND_UI_MAX } from "@/lib/constants";

function fmtFund(val: number) {
  if (val >= FUND_UI_MAX) return "∞";
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(1)}K`;
  return `${val}`;
}

export function ActiveFiltersSummary({ onClear }: ActiveFiltersSummaryProps) {
  const {
    filters,
    clearFilters,
    networkButtonCount,
  } = useFilters();

  const chips: string[] = [];
  const addr = (filters.address || "").trim();
  const cname = (filters.name || "").trim();
  if (addr) chips.push(`Address: ${addr}`);
  if (cname) chips.push(`Name: ${cname}`);
  if (filters.timeMin !== 0 || filters.timeMax !== 12) {
    chips.push(`Time: ${TIME_RANGES[filters.timeMin]}-${TIME_RANGES[filters.timeMax]}`);
  }
  if (filters.fundMin !== 0 || filters.fundMax !== FUND_UI_MAX) {
    chips.push(`Fund: ${fmtFund(filters.fundMin)}-${fmtFund(filters.fundMax)}`);
  }
  if (filters.networks.length > 0 && filters.networks.length < networkButtonCount) {
    chips.push(`Networks: ${filters.networks.length}`);
  }

  const hasFilters = chips.length > 0;

  return (
    <div className="border-t border-border pt-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <ListFilter className="h-4 w-4" />
          <span>Active filters</span>
          <span className={hasFilters ? "hidden" : ""}>None</span>
        </div>
        <button
          onClick={() => (onClear ?? clearFilters)()}
          disabled={!hasFilters}
          className={`rounded-md border border-border px-2 py-1 text-xs transition focus-ring ${
            hasFilters
              ? "text-text-muted hover:bg-bg-tertiary hover:text-text-primary"
              : "cursor-not-allowed opacity-50"
          }`}
        >
          Clear active
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {chips.map((chip) => (
          <span
            key={chip}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-bg-secondary px-2.5 py-1 text-xs text-text-primary"
          >
            {chip}
          </span>
        ))}
      </div>
    </div>
  );
}
