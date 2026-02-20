"use client";

import Link from "next/link";
import type { Contract } from "@/types/contract";
import { EXPLORER_MAP, TX_EXPLORER_MAP, NETWORK_COLORS } from "@/lib/constants";
import {
  getCanonicalContractName,
  isVerifiedContract,
  isProxyContract,
  getImplementationAddress,
  getDeployTxHash,
  formatContractDate,
  formatFund,
} from "@/lib/contract-utils";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { Erc20BalancesDisplay } from "./Erc20BalancesDisplay";
import { Badge } from "../ui/Badge";

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
  const txBase = TX_EXPLORER_MAP[netKey];
  const deployTxHash = getDeployTxHash(contract);
  const deployTxHref =
    txBase && deployTxHash ? `${txBase}${deployTxHash}` : null;
  const verified = isVerifiedContract(contract);
  const isProxy = isProxyContract(contract);
  const implAddress = getImplementationAddress(contract);
  const netColor = NETWORK_COLORS[netKey] ?? "bg-gray-500";

  return (
    <div className="rounded-xl border border-border bg-bg-secondary p-4 shadow-sm transition hover:border-accent/30 hover:shadow-lg">
      <div className="flex items-center justify-between gap-3">
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
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all font-mono text-xs font-medium text-accent hover:underline flex-1 min-w-0"
            title="View on explorer"
          >
            {short}
          </a>
        ) : (
          <span className="break-all font-mono text-xs font-medium text-accent flex-1 min-w-0">
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
        className={`mt-2 block truncate text-sm hover:underline ${isUnnamed ? "italic text-text-muted" : "text-text-primary"}`}
      >
        {displayName}
      </Link>
      <div className="mt-1 flex flex-wrap gap-1">
        <Badge variant={verified ? "success" : "muted"}>
          {verified ? "Verified" : "Unverified"}
        </Badge>
        {isProxy && <Badge variant="warning">Proxy</Badge>}
      </div>
      <div className="mt-2 flex items-center gap-4 text-xs text-text-muted">
        <span className="flex items-center gap-1.5">
          <span
            role="img"
            aria-label="EVMBench"
            className={`inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border ${
              contract.evmbench
                ? "border-accent bg-accent"
                : "border-border bg-bg-tertiary"
            }`}
          >
            {contract.evmbench && (
              <svg className="h-2 w-2 text-bg-primary" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="2 6 5 9 10 3" />
              </svg>
            )}
          </span>
          EVMBENCH
        </span>
        <span className="flex items-center gap-1.5">
          <span
            role="img"
            aria-label="GetRecon"
            className={`inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border ${
              contract.getrecon
                ? "border-accent bg-accent"
                : "border-border bg-bg-tertiary"
            }`}
          >
            {contract.getrecon && (
              <svg className="h-2 w-2 text-bg-primary" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="2 6 5 9 10 3" />
              </svg>
            )}
          </span>
          GETRECON
        </span>
      </div>
      {isProxy && implAddress && (
        <div className="mt-1 font-mono text-[10px] text-text-muted">
          Impl: {implAddress.slice(0, 8)}...{implAddress.slice(-6)}
        </div>
      )}
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="flex flex-col rounded-lg bg-bg-tertiary px-2 py-1.5">
          <span className="text-text-muted">Deployed</span>
          <span className="mt-0.5 text-text-primary">{formatContractDate(contract) || "-"}</span>
          {deployTxHref && (
            <a
              href={deployTxHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 text-[10px] text-accent hover:underline"
            >
              Deploy TX
            </a>
          )}
        </div>
        <div className="flex flex-col rounded-lg bg-bg-tertiary px-2 py-1.5">
          <span className="text-text-muted">Native</span>
          <span className="mt-0.5 font-semibold text-accent">
            {formatFund(contract, nativePrices)}
          </span>
        </div>
      </div>
      {(contract.erc20_balances?.length ?? 0) > 0 && (
        <div className="mt-2 flex flex-col rounded-lg bg-bg-tertiary px-2 py-1.5 text-xs">
          <span className="text-text-muted">ERC-20</span>
          <span className="mt-0.5">
            <Erc20BalancesDisplay balances={contract.erc20_balances} />
          </span>
        </div>
      )}
    </div>
  );
}
