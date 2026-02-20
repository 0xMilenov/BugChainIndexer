"use client";

import { DollarSign } from "lucide-react";
import { useFilters } from "@/context/FilterContext";
import { FUND_UI_MAX } from "@/lib/constants";

function fmt(val: number) {
  if (val >= FUND_UI_MAX) return "∞";
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(1)}K`;
  return `${val}`;
}

export function FundRangeSlider() {
  const { filters, setFundMin, setFundMax } = useFilters();
  const fMin = (filters.fundMin / FUND_UI_MAX) * 100;
  const fMax = (filters.fundMax / FUND_UI_MAX) * 100;

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <DollarSign className="h-4 w-4 text-text-muted" />
        <label className="text-sm font-medium text-text-primary">
          Fund Range:{" "}
          <span className="font-normal text-text-muted">
            ${fmt(filters.fundMin)} - ${fmt(filters.fundMax)}
          </span>
        </label>
      </div>
      <div className="relative">
        <div className="mb-2 flex justify-between text-xs text-text-muted">
          <span>Min: $0</span>
          <span>Max: ∞</span>
        </div>
        <div className="relative h-2 rounded-lg bg-bg-tertiary">
          <div
            className="absolute h-2 rounded-lg bg-accent"
            style={{ left: `${fMin}%`, width: `${fMax - fMin}%` }}
          />
          <input
            type="range"
            min={0}
            max={FUND_UI_MAX}
            value={filters.fundMin}
            onChange={(e) => setFundMin(parseInt(e.target.value, 10))}
            className="absolute left-0 top-0 h-2 w-full cursor-pointer opacity-0"
          />
          <input
            type="range"
            min={0}
            max={FUND_UI_MAX}
            value={filters.fundMax}
            onChange={(e) => setFundMax(parseInt(e.target.value, 10))}
            className="absolute left-0 top-0 h-2 w-full cursor-pointer opacity-0"
          />
        </div>
      </div>
    </div>
  );
}
