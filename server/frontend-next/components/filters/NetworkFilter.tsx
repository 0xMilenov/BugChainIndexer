"use client";

import { useState, useEffect, useRef } from "react";
import { Network, ChevronDown, Check } from "lucide-react";
import { useFilters } from "@/context/FilterContext";
import { NETWORK_DISPLAY_NAMES } from "@/lib/constants";
import { useNetworkCounts } from "@/hooks/useNetworkCounts";

export function NetworkFilter() {
  const { filters, toggleNetwork, selectAllNetworks, clearAllNetworks, networkButtonCount } = useFilters();
  const { counts } = useNetworkCounts();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selectedCount = filters.networks.length;
  const label =
    selectedCount === 0
      ? "No networks"
      : selectedCount === networkButtonCount
        ? "All networks"
        : `${selectedCount} networks`;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-text-primary transition hover:bg-bg-tertiary"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <Network className="h-4 w-4 text-text-muted" />
          {label}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-text-muted transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-64 overflow-y-auto rounded-lg border border-border bg-bg-secondary shadow-xl">
          <div className="sticky top-0 flex gap-1 border-b border-border bg-bg-tertiary p-2">
            <button
              type="button"
              onClick={() => {
                selectAllNetworks();
              }}
              className="flex-1 rounded px-2 py-1 text-xs font-medium text-accent hover:bg-accent/10"
            >
              All
            </button>
            <button
              type="button"
              onClick={() => {
                clearAllNetworks();
              }}
              className="flex-1 rounded px-2 py-1 text-xs font-medium text-text-muted hover:bg-bg-secondary hover:text-text-primary"
            >
              None
            </button>
          </div>
          <div className="p-2">
            {Object.entries(NETWORK_DISPLAY_NAMES).map(([key, label]) => {
              const selected = filters.networks.includes(key);
              const count = counts[key];
              const countText =
                count != null
                  ? count >= 1000
                    ? `${(count / 1000).toFixed(1)}K`
                    : count.toString()
                  : "—";
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleNetwork(key)}
                  className="flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-sm transition hover:bg-bg-tertiary"
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                        selected
                          ? "border-accent bg-accent text-bg-primary"
                          : "border-border bg-bg-secondary"
                      }`}
                    >
                      {selected && <Check className="h-2.5 w-2.5" />}
                    </span>
                    {label}
                  </span>
                  <span className="text-xs text-text-muted">({countText})</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
