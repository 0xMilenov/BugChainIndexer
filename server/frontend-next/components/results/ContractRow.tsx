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
} from "@/lib/contract-utils";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { Erc20BalancesDisplay } from "./Erc20BalancesDisplay";
import { Badge } from "../ui/Badge";

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
  severity: "critical" | "high" | "medium";
  className: string;
}) {
  const text = formatAuditSeverityCell(contract, severity);
  const isCount = text !== "-";
  return (
    <td
      className={`whitespace-nowrap px-4 py-3 text-right font-mono text-sm tabular-nums ${className} ${
        isCount ? "font-semibold" : "text-text-muted font-normal"
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
    <tr className="border-b border-border transition hover:bg-bg-tertiary/50">
      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">
        <div className="flex items-center gap-2">
          {onBookmarkToggle && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onBookmarkToggle({ address: contract.address, network: contract.network ?? "" });
              }}
              className="flex-shrink-0 rounded p-0.5 text-text-muted hover:text-accent transition"
              aria-label={isBookmarked ? "Remove bookmark" : "Add bookmark"}
            >
              {isBookmarked ? (
                <BookmarkCheck className="h-4 w-4 fill-accent text-accent" />
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
              className="font-medium text-accent hover:text-accent-dim hover:underline"
              title="View on explorer"
            >
              {short}
            </a>
          ) : (
            <span className="font-medium text-accent">{short}</span>
          )}
        </div>
      </td>
      <td className="max-w-[20rem] px-4 py-3">
        <Link
          href={`/contract/${contract.network}/${contract.address}`}
          className={`block truncate hover:underline ${isUnnamed ? "italic text-text-muted" : "text-text-primary"}`}
        >
          {displayName}
          <span className="ml-2 inline-flex gap-1">
            <Badge variant={verified ? "success" : "muted"}>
              {verified ? "Verified" : "Unverified"}
            </Badge>
            {isProxy && <Badge variant="warning">Proxy</Badge>}
          </span>
        </Link>
        {isProxy && proxyImpl && (
          <div className="mt-1 text-[10px] text-text-muted font-mono">
            Impl: {proxyImpl.slice(0, 6)}...{proxyImpl.slice(-4)}
          </div>
        )}
      </td>
      <td className="whitespace-nowrap px-4 py-3">
        {contract.network && (
          <span
            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium text-white ${netColor}`}
          >
            {contract.network}
          </span>
        )}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-right">
        <span className="font-semibold text-accent">
          {formatFund(contract, nativePrices)}
        </span>
      </td>
      <td className="max-w-[12rem] px-4 py-3 text-left text-xs">
        <Erc20BalancesDisplay balances={contract.erc20_balances} />
      </td>
      <SeverityCountCell contract={contract} severity="critical" className="text-red-400/95" />
      <SeverityCountCell contract={contract} severity="high" className="text-orange-400/95" />
      <SeverityCountCell contract={contract} severity="medium" className="text-amber-400/95" />
    </tr>
  );
}
