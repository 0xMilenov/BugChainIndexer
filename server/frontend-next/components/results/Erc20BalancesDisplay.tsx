"use client";

import { useState, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import type { Erc20Balance } from "@/types/contract";
import { getSortedErc20Balances } from "@/lib/contract-utils";
import { ChevronDown } from "lucide-react";

interface Erc20BalancesDisplayProps {
  balances: Erc20Balance[] | undefined;
  className?: string;
}

function formatValue(val: number): string {
  return val.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function Erc20BalancesDisplay({
  balances,
  className = "",
}: Erc20BalancesDisplayProps) {
  const sorted = getSortedErc20Balances(balances);
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEnter = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    setIsOpen(true);
  };

  const handleLeave = () => {
    hideTimerRef.current = setTimeout(() => setIsOpen(false), 150);
  };

  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownWidth = 220;
    const dropdownHeight = 240;
    const gap = 4;
    // Align dropdown with trigger: left edge matches trigger, appears below
    let top = rect.bottom + gap;
    let left = rect.left;
    if (left + dropdownWidth > window.innerWidth - 8) left = window.innerWidth - dropdownWidth - 8;
    if (left < 8) left = 8;
    if (top + dropdownHeight > window.innerHeight - 8) top = Math.max(8, rect.top - dropdownHeight - gap);
    setPosition({ top, left });
  }, [isOpen]);

  if (!sorted.length) return <span className={className}>-</span>;

  const top = sorted[0];
  const restCount = sorted.length - 1;
  const hasMore = restCount > 0;

  const dropdownContent = hasMore && isOpen && typeof document !== "undefined" && document.body && (
    createPortal(
      <div
        className="fixed z-[9999] min-w-[180px] max-w-[280px] rounded-lg border border-border bg-bg-secondary py-2 shadow-lg"
        style={{ top: position.top, left: position.left }}
        role="tooltip"
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
      >
        <div className="max-h-[240px] overflow-y-auto px-3">
          <div className="text-[10px] uppercase tracking-wider text-text-muted mb-1.5 px-0.5">
            All token balances
          </div>
          {sorted.map((b) => (
            <div
              key={b.symbol}
              className="flex justify-between gap-4 py-1 text-xs text-text-primary"
            >
              <span className="font-medium">{b.symbol}</span>
              <span className="tabular-nums text-text-muted">
                {formatValue(b.value)}
              </span>
            </div>
          ))}
        </div>
      </div>,
      document.body
    )
  );

  return (
    <>
      <div
        ref={triggerRef}
        className={`group relative inline-block ${className}`}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
      >
        <span className="inline-flex cursor-default items-center gap-0.5 font-medium text-text-primary">
          <span>
            {top.symbol}: {formatValue(top.value)}
          </span>
          {hasMore && (
            <>
              <span className="text-text-muted">+{restCount} more</span>
              <ChevronDown
                className={`h-3 w-3 text-text-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
              />
            </>
          )}
        </span>
      </div>
      {dropdownContent}
    </>
  );
}
