"use client";

import Link from "next/link";
import type { Contract } from "@/types/contract";
import { EXPLORER_MAP, NETWORK_COLORS } from "@/lib/constants";
import {
  getCanonicalContractName,
  isVerifiedContract,
  isProxyContract,
  getImplementationAddress,
  formatFund,
  formatAuditSeverityCell,
  hasCompletedAuditListing,
} from "@/lib/contract-utils";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { Erc20BalancesDisplay } from "./Erc20BalancesDisplay";
import { Badge } from "../ui/Badge";
import { RunAuditCell } from "./RunAuditCell";

interface ContractCardProps {
  contract: Contract;
  nativePrices: Record<string, number>;
  isBookmarked?: boolean;
  onBookmarkToggle?: (contract: { address: string; network: string }) => void;
}

export function ContractCard({ contract, nativePrices, isBookmarked = false, onBookmarkToggle }: ContractCardProps) {
  const displayName = getCanonicalContractName(contract);
  const isUnnamed = displayName === "Unnamed Contract";
  const full = contract.address ?? "";
  const short = full ? `${full.slice(0, 6)}...${full.slice(-6)}` : "";
  const netKey = contract.network?.toLowerCase() ?? "";
  const base = EXPLORER_MAP[netKey];
  const link = base ? `${base}${full}` : "#";
  const verified = isVerifiedContract(contract);
  const isProxy = isProxyContract(contract);
  const implAddress = getImplementationAddress(contract);
  const netColor = NETWORK_COLORS[netKey] ?? "bg-gray-500";

  return (
    <div className="rounded-md border border-rule bg-ink-1 p-4 shadow-sm transition hover:border-blue-600/30 hover:shadow-lg">
      <div className="flex items-center justify-between gap-3">
        {onBookmarkToggle && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onBookmarkToggle({ address: contract.address, network: contract.network ?? "" });
            }}
            className="flex-shrink-0 rounded p-0.5 text-faint hover:text-blue-text transition"
            aria-label={isBookmarked ? "Remove bookmark" : "Add bookmark"}
          >
            {isBookmarked ? (
              <BookmarkCheck className="h-4 w-4 fill-blue-600 text-blue-text" />
            ) : (
              <Bookmark className="h-4 w-4" />
            )}
          </button>
        )}
        {base ? (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all font-data text-xs font-medium text-blue-text hover:underline flex-1 min-w-0"
            title="View on explorer"
          >
            {short}
          </a>
        ) : (
          <span className="break-all font-data text-xs font-medium text-blue-text flex-1 min-w-0">
            {short}
          </span>
        )}
        {contract.network && (
          <span
            className={`flex-shrink-0 rounded-full px-2 py-1 text-xs font-medium text-white ${netColor}`}
          >
            {contract.network}
          </span>
        )}
      </div>
      <Link
        href={`/contract/${contract.network}/${contract.address}`}
        className={`mt-2 block truncate text-sm hover:underline ${isUnnamed ? "italic text-faint" : "text-body"}`}
      >
        {displayName}
      </Link>
      <div className="mt-1 flex flex-wrap gap-1">
        <Badge variant={verified ? "success" : "muted"}>
          {verified ? "Verified" : "Unverified"}
        </Badge>
        {isProxy && <Badge variant="warning">Proxy</Badge>}
      </div>
      {isProxy && implAddress && (
        <div className="mt-1 font-data text-[10px] text-faint">
          Impl: {implAddress.slice(0, 8)}...{implAddress.slice(-6)}
        </div>
      )}
      <div className="mt-3 flex flex-col rounded-md bg-ink-2 px-2 py-1.5 text-xs">
        <span className="text-faint">Funds</span>
        <span className="mt-0.5 font-semibold text-blue-text">
          {formatFund(contract, nativePrices)}
        </span>
      </div>
      {(contract.erc20_balances?.length ?? 0) > 0 && (
        <div className="mt-2 flex flex-col rounded-md bg-ink-2 px-2 py-1.5 text-xs">
          <span className="text-faint">ERC-20</span>
          <span className="mt-0.5">
            <Erc20BalancesDisplay balances={contract.erc20_balances} />
          </span>
        </div>
      )}
      {hasCompletedAuditListing(contract) ? (
        <div className="mt-2 grid grid-cols-4 gap-2 text-xs">
          <div className="flex flex-col rounded-md bg-ink-2 px-2 py-1.5">
            <span className="text-sev-crit-text/90">Crit</span>
            <span
              className={`mt-0.5 font-data tabular-nums ${
                formatAuditSeverityCell(contract, "critical") === "-"
                  ? "text-faint"
                  : "font-semibold text-body"
              }`}
            >
              {formatAuditSeverityCell(contract, "critical")}
            </span>
          </div>
          <div className="flex flex-col rounded-md bg-ink-2 px-2 py-1.5">
            <span className="text-sev-high/90">High</span>
            <span
              className={`mt-0.5 font-data tabular-nums ${
                formatAuditSeverityCell(contract, "high") === "-"
                  ? "text-faint"
                  : "font-semibold text-body"
              }`}
            >
              {formatAuditSeverityCell(contract, "high")}
            </span>
          </div>
          <div className="flex flex-col rounded-md bg-ink-2 px-2 py-1.5">
            <span className="text-sev-med/90">Med</span>
            <span
              className={`mt-0.5 font-data tabular-nums ${
                formatAuditSeverityCell(contract, "medium") === "-"
                  ? "text-faint"
                  : "font-semibold text-body"
              }`}
            >
              {formatAuditSeverityCell(contract, "medium")}
            </span>
          </div>
          <div className="flex flex-col rounded-md bg-ink-2 px-2 py-1.5">
            <span className="text-sev-low-text/90">Low</span>
            <span
              className={`mt-0.5 font-data tabular-nums ${
                formatAuditSeverityCell(contract, "low") === "-"
                  ? "text-faint"
                  : "font-semibold text-body"
              }`}
            >
              {formatAuditSeverityCell(contract, "low")}
            </span>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex items-center justify-end">
          <RunAuditCell contract={contract} />
        </div>
      )}
    </div>
  );
}
