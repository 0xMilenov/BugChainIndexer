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

interface ContractRowProps {
  contract: Contract;
  nativePrices: Record<string, number>;
  isBookmarked?: boolean;
  onBookmarkToggle?: (contract: { address: string; network: string }) => void;
}

function SeverityCountCell({
  contract,
  severity,
  className,
}: {
  contract: Contract;
  severity: "critical" | "high" | "medium" | "low";
  className: string;
}) {
  const text = formatAuditSeverityCell(contract, severity);
  const isCount = text !== "-";
  return (
    <td
      className={`whitespace-nowrap px-4 py-3.5 text-right font-data text-sm tabular-nums ${
        isCount ? `font-semibold ${className}` : "font-normal text-ghost"
      }`}
    >
      {text}
    </td>
  );
}

export function ContractRow({
  contract,
  nativePrices,
  isBookmarked = false,
  onBookmarkToggle,
}: ContractRowProps) {
  const displayName = getCanonicalContractName(contract);
  const isUnnamed = displayName === "Unnamed Contract";
  const short = contract.address
    ? `${contract.address.slice(0, 6)}...${contract.address.slice(-6)}`
    : "";
  const netKey = contract.network?.toLowerCase() ?? "";
  const base = EXPLORER_MAP[netKey];
  const href = base ? `${base}${contract.address}` : "#";
  const proxyImpl = getImplementationAddress(contract);
  const verified = isVerifiedContract(contract);
  const isProxy = isProxyContract(contract);
  const netColor = NETWORK_COLORS[netKey] ?? "bg-gray-500";

  return (
    <tr className="border-b border-rule/60 transition-colors last:border-b-0 hover:bg-ink-2/50">
      {/* Address */}
      <td className="whitespace-nowrap px-4 py-3.5">
        <div className="flex items-center gap-2">
          {onBookmarkToggle && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onBookmarkToggle({ address: contract.address, network: contract.network ?? "" });
              }}
              className="flex-shrink-0 rounded p-0.5 text-faint transition-colors hover:text-blue-text"
              aria-label={isBookmarked ? "Remove bookmark" : "Add bookmark"}
            >
              {isBookmarked ? (
                <BookmarkCheck className="h-4 w-4 fill-blue-600 text-blue-600" />
              ) : (
                <Bookmark className="h-4 w-4" />
              )}
            </button>
          )}
          {base ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-data text-[12px] text-blue-text transition-colors hover:text-blue-300"
              title="View on explorer"
            >
              {short}
            </a>
          ) : (
            <span className="font-data text-[12px] text-dim">{short}</span>
          )}
        </div>
      </td>

      {/* Contract name + status */}
      <td className="max-w-[20rem] px-4 py-3.5">
        <Link
          href={`/contract/${contract.network}/${contract.address}`}
          className={`group/name flex items-center gap-2 ${
            isUnnamed ? "italic text-faint" : "text-body hover:text-paper"
          }`}
        >
          <span className="truncate group-hover/name:underline">{displayName}</span>
          <span className="inline-flex flex-shrink-0 gap-1">
            <Badge variant={verified ? "success" : "muted"}>
              {verified ? "Verified" : "Unverified"}
            </Badge>
            {isProxy && <Badge variant="warning">Proxy</Badge>}
          </span>
        </Link>
        {isProxy && proxyImpl && (
          <div className="mt-1 font-data text-[10px] text-faint">
            impl {proxyImpl.slice(0, 6)}...{proxyImpl.slice(-4)}
          </div>
        )}
      </td>

      {/* Network */}
      <td className="whitespace-nowrap px-4 py-3.5">
        {contract.network && (
          <span className="inline-flex items-center gap-1.5 rounded-[3px] border border-rule bg-ink-2 px-2 py-[3px] font-data text-[11px] text-dim">
            <span className={`h-1.5 w-1.5 rounded-[1px] ${netColor}`} aria-hidden />
            {contract.network}
          </span>
        )}
      </td>

      {/* Native balance */}
      <td className="whitespace-nowrap px-4 py-3.5 text-right">
        <span className="font-data text-sm font-medium tabular-nums text-body">
          {formatFund(contract, nativePrices)}
        </span>
      </td>

      {/* Holdings */}
      <td className="max-w-[12rem] px-4 py-3.5 text-left text-xs">
        <Erc20BalancesDisplay balances={contract.erc20_balances} />
      </td>

      {/* Severity counts, or an audit action when none exists yet */}
      {hasCompletedAuditListing(contract) ? (
        <>
          <SeverityCountCell contract={contract} severity="critical" className="text-sev-crit-text" />
          <SeverityCountCell contract={contract} severity="high" className="text-sev-high" />
          <SeverityCountCell contract={contract} severity="medium" className="text-sev-med" />
          <SeverityCountCell contract={contract} severity="low" className="text-sev-low-text" />
        </>
      ) : (
        <td colSpan={4} className="whitespace-nowrap px-4 py-3.5 text-right">
          <RunAuditCell contract={contract} compact />
        </td>
      )}
    </tr>
  );
}
