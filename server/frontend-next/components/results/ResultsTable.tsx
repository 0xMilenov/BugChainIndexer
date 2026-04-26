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

function ColumnSortIcon({
  col,
  sortColumn,
  sortDirection,
}: {
  col: string;
  sortColumn: string;
  sortDirection: "asc" | "desc";
}) {
  if (sortColumn !== col)
    return <ChevronsUpDown className="ml-1 inline-block h-3 w-3 opacity-40" />;
  return sortDirection === "asc" ? (
    <ChevronUp className="ml-1 inline-block h-3 w-3" />
  ) : (
    <ChevronDown className="ml-1 inline-block h-3 w-3" />
  );
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
                Address{" "}
                <ColumnSortIcon col="address" sortColumn={sortColumn} sortDirection={sortDirection} />
              </th>
              <th
                className="cursor-pointer px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider transition hover:bg-border/50"
                onClick={() => onSort("name")}
              >
                Contract Name{" "}
                <ColumnSortIcon col="name" sortColumn={sortColumn} sortDirection={sortDirection} />
              </th>
              <th
                className="cursor-pointer px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider transition hover:bg-border/50"
                onClick={() => onSort("network")}
              >
                Network{" "}
                <ColumnSortIcon col="network" sortColumn={sortColumn} sortDirection={sortDirection} />
              </th>
              <th
                className="cursor-pointer px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider transition hover:bg-border/50"
                onClick={() => onSort("fund")}
              >
                Native{" "}
                <ColumnSortIcon col="fund" sortColumn={sortColumn} sortDirection={sortDirection} />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                ERC-20 Tokens
              </th>
              <th
                className="cursor-pointer px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-red-400/90 transition hover:bg-border/50"
                onClick={() => onSort("critical")}
              >
                Critical{" "}
                <ColumnSortIcon col="critical" sortColumn={sortColumn} sortDirection={sortDirection} />
              </th>
              <th
                className="cursor-pointer px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-orange-400/90 transition hover:bg-border/50"
                onClick={() => onSort("high")}
              >
                High{" "}
                <ColumnSortIcon col="high" sortColumn={sortColumn} sortDirection={sortDirection} />
              </th>
              <th
                className="cursor-pointer px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-amber-400/90 transition hover:bg-border/50"
                onClick={() => onSort("medium")}
              >
                Medium{" "}
                <ColumnSortIcon col="medium" sortColumn={sortColumn} sortDirection={sortDirection} />
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
