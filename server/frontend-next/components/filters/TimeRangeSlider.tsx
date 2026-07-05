"use client";

import { Calendar } from "lucide-react";
import { useFilters } from "@/context/FilterContext";
import { TIME_RANGES } from "@/lib/constants";

export function TimeRangeSlider() {
  const { filters, setTimeMin, setTimeMax } = useFilters();
  const maxIdx = 12;

  const tMin = (filters.timeMin / maxIdx) * 100;
  const tMax = (filters.timeMax / maxIdx) * 100;

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Calendar className="h-4 w-4 text-faint" />
        <label className="text-sm font-medium text-body">
          Time Range:{" "}
          <span className="font-normal text-faint">
            {TIME_RANGES[filters.timeMin]} - {TIME_RANGES[filters.timeMax]} ago
          </span>
        </label>
      </div>
      <div className="relative">
        <div className="mb-2 flex justify-between text-xs text-faint">
          <span>Min: 1h</span>
          <span>Max: ∞</span>
        </div>
        <div className="relative h-2 rounded-lg bg-ink-2">
          <div
            className="absolute h-2 rounded-lg bg-blue-600"
            style={{ left: `${tMin}%`, width: `${tMax - tMin}%` }}
          />
          <input
            type="range"
            min={0}
            max={maxIdx}
            value={filters.timeMin}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              setTimeMin(Math.min(v, filters.timeMax));
            }}
            className="absolute left-0 top-0 z-10 h-2 w-full cursor-pointer opacity-0"
          />
          <input
            type="range"
            min={0}
            max={maxIdx}
            value={filters.timeMax}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              setTimeMax(Math.max(v, filters.timeMin));
            }}
            className="absolute left-0 top-0 z-10 h-2 w-full cursor-pointer opacity-0"
          />
        </div>
      </div>
    </div>
  );
}
