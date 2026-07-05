"use client";

import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
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
    return <ChevronsUpDown className="ml-1 inline-block h-3 w-3 text-ghost" />;
  return sortDirection === "asc" ? (
    <ChevronUp className="ml-1 inline-block h-3 w-3 text-blue-text" />
  ) : (
    <ChevronDown className="ml-1 inline-block h-3 w-3 text-blue-text" />
  );
}

const TH_BASE =
  "px-4 py-3 font-data text-[11px] font-medium uppercase tracking-[0.1em] text-faint select-none";
const TH_SORT = "cursor-pointer transition-colors hover:text-dim";

export function ResultsTable({
  contracts,
  nativePrices,
  sortColumn,
  sortDirection,
  onSort,
  isBookmarked,
  onBookmarkToggle,
}: ResultsTableProps) {
  const sortProps = (
    col: string
  ): { onClick: () => void; "aria-sort": React.AriaAttributes["aria-sort"] } => ({
    onClick: () => onSort(col),
    "aria-sort":
      sortColumn === col ? (sortDirection === "asc" ? "ascending" : "descending") : "none",
  });

  return (
    <div className="overflow-hidden rounded-md border border-rule bg-ink-1">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead className="border-b border-rule bg-ink-2">
            <tr>
              <th className={`${TH_BASE} ${TH_SORT} text-left`} {...sortProps("address")}>
                Address
                <ColumnSortIcon col="address" sortColumn={sortColumn} sortDirection={sortDirection} />
              </th>
              <th className={`${TH_BASE} ${TH_SORT} text-left`} {...sortProps("name")}>
                Contract
                <ColumnSortIcon col="name" sortColumn={sortColumn} sortDirection={sortDirection} />
              </th>
              <th className={`${TH_BASE} ${TH_SORT} text-left`} {...sortProps("network")}>
                Network
                <ColumnSortIcon col="network" sortColumn={sortColumn} sortDirection={sortDirection} />
              </th>
              <th className={`${TH_BASE} ${TH_SORT} text-right`} {...sortProps("fund")}>
                Native
                <ColumnSortIcon col="fund" sortColumn={sortColumn} sortDirection={sortDirection} />
              </th>
              <th className={`${TH_BASE} text-left`}>Holdings</th>
              <th
                className={`${TH_BASE} ${TH_SORT} text-right text-sev-crit-text/75`}
                {...sortProps("critical")}
              >
                Crit
                <ColumnSortIcon col="critical" sortColumn={sortColumn} sortDirection={sortDirection} />
              </th>
              <th
                className={`${TH_BASE} ${TH_SORT} text-right text-sev-high/75`}
                {...sortProps("high")}
              >
                High
                <ColumnSortIcon col="high" sortColumn={sortColumn} sortDirection={sortDirection} />
              </th>
              <th
                className={`${TH_BASE} ${TH_SORT} text-right text-sev-med/75`}
                {...sortProps("medium")}
              >
                Med
                <ColumnSortIcon col="medium" sortColumn={sortColumn} sortDirection={sortDirection} />
              </th>
              <th
                className={`${TH_BASE} ${TH_SORT} text-right text-sev-low-text/75`}
                {...sortProps("low")}
              >
                Low
                <ColumnSortIcon col="low" sortColumn={sortColumn} sortDirection={sortDirection} />
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
