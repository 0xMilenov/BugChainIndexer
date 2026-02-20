"use client";

import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
} from "lucide-react";
import type { Contract } from "@/types/contract";
import { ContractRow } from "./ContractRow";

interface ResultsTableProps {
  contracts: Contract[];
  nativePrices: Record<string, number>;
  sortColumn: string;
  sortDirection: "asc" | "desc";
  onSort: (col: string) => void;
  isBookmarked?: (address: string, network: string) => boolean;
  onBookmarkToggle?: (contract: { address: string; network: string }) => void;
}

export function ResultsTable({
  contracts,
  nativePrices,
  sortColumn,
  sortDirection,
  onSort,
  isBookmarked,
  onBookmarkToggle,
}: ResultsTableProps) {
  const SortIcon = ({ col }: { col: string }) => {
    if (sortColumn !== col)
      return <ChevronsUpDown className="ml-1 inline-block h-3 w-3 opacity-40" />;
    return sortDirection === "asc" ? (
      <ChevronUp className="ml-1 inline-block h-3 w-3" />
    ) : (
      <ChevronDown className="ml-1 inline-block h-3 w-3" />
    );
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-bg-secondary">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-bg-tertiary text-text-muted">
            <tr>
              <th
                className="cursor-pointer px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider transition hover:bg-border/50"
                onClick={() => onSort("address")}
              >
                Address <SortIcon col="address" />
              </th>
              <th
                className="cursor-pointer px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider transition hover:bg-border/50"
                onClick={() => onSort("name")}
              >
                Contract Name <SortIcon col="name" />
              </th>
              <th
                className="cursor-pointer px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider transition hover:bg-border/50"
                onClick={() => onSort("network")}
              >
                Network <SortIcon col="network" />
              </th>
              <th
                className="cursor-pointer px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider transition hover:bg-border/50"
                onClick={() => onSort("deployed")}
              >
                Deployed <SortIcon col="deployed" />
              </th>
              <th
                className="cursor-pointer px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider transition hover:bg-border/50"
                onClick={() => onSort("fund")}
              >
                Native <SortIcon col="fund" />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                ERC-20 Tokens
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">
                EVMBENCH
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">
                GETRECON
              </th>
            </tr>
          </thead>
          <tbody>
            {contracts.map((c) => (
              <ContractRow
                key={`${c.address}-${c.network}`}
                contract={c}
                nativePrices={nativePrices}
                isBookmarked={isBookmarked?.(c.address, c.network ?? "") ?? false}
                onBookmarkToggle={onBookmarkToggle}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
