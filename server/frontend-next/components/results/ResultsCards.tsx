"use client";

import type { Contract } from "@/types/contract";
import { ContractCard } from "./ContractCard";

interface ResultsCardsProps {
  contracts: Contract[];
  nativePrices: Record<string, number>;
  isBookmarked?: (address: string, network: string) => boolean;
  onBookmarkToggle?: (contract: { address: string; network: string }) => void;
}

export function ResultsCards({
  contracts,
  nativePrices,
  isBookmarked,
  onBookmarkToggle,
}: ResultsCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 p-3">
      {contracts.map((c) => (
        <ContractCard
          key={`${c.address}-${c.network}`}
          contract={c}
          nativePrices={nativePrices}
          isBookmarked={isBookmarked?.(c.address, c.network ?? "") ?? false}
          onBookmarkToggle={onBookmarkToggle}
        />
      ))}
    </div>
  );
}
