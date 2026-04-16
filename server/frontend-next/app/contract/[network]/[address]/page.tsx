"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getContract } from "@/lib/api";
import type { ContractDetail } from "@/lib/api";
import type { Contract } from "@/types/contract";
import { formatContractDate, formatFund } from "@/lib/contract-utils";
import { Erc20BalancesDisplay } from "@/components/results/Erc20BalancesDisplay";
import { useNativePrices } from "@/hooks/useNativePrices";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useAuth } from "@/context/AuthContext";
import { useShowToast } from "@/context/ToastContext";
import { EXPLORER_MAP, TX_EXPLORER_MAP, NETWORK_COLORS } from "@/lib/constants";
import { ArrowLeft, Bookmark, BookmarkCheck } from "lucide-react";
import { Header } from "@/components/Header";
import { Badge } from "@/components/ui/Badge";
import ReactMarkdown from "react-markdown";

function getContractName(c: ContractDetail): string {
  const name = c?.contract_name?.trim();
  return name || "Unnamed Contract";
}

const ACTION_BUTTON_BASE =
  "flex items-center justify-center gap-1.5 w-full min-w-0 h-full min-h-[2.75rem] rounded-lg border border-border bg-bg-tertiary px-3 text-sm font-medium text-text-primary transition hover:border-accent/40 hover:bg-accent/10 overflow-hidden";

export default function ContractDetailPage() {
  const params = useParams();
  const network = params?.network as string;
  const address = params?.address as string;
  const [contract, setContract] = useState<ContractDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const nativePrices = useNativePrices();
  const router = useRouter();
  const { bookmarks, saveBookmark, removeBookmark, isBookmarked } = useBookmarks();
  const { user } = useAuth();
  const showToast = useShowToast();

  const fetchContract = useCallback(async () => {
    if (!address || !network) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await getContract(address, network);
      if (resp.ok && resp.contract) {
        setContract(resp.contract);
      } else {
        setError(resp.error || "Contract not found");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load contract");
    } finally {
      setLoading(false);
    }
  }, [address, network]);

  useEffect(() => {
    fetchContract();
  }, [fetchContract]);

  if (!address || !network) {
    return (
      <div className="min-h-screen bg-bg-primary">
        <Header onShowBookmarks={() => router.push("/")} bookmarkCount={bookmarks.length} />
        <div className="p-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-accent hover:text-accent-dim hover:underline mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to search
        </Link>
        <p className="text-text-muted">Invalid contract address or network.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary">
        <Header onShowBookmarks={() => router.push("/")} bookmarkCount={bookmarks.length} />
        <div className="p-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-accent hover:text-accent-dim hover:underline mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to search
        </Link>
        <div className="space-y-4">
          <div className="h-8 w-64 skeleton rounded" />
          <div className="h-4 w-full skeleton rounded" />
          <div className="h-4 w-3/4 skeleton rounded" />
        </div>
        </div>
      </div>
    );
  }

  if (error || !contract) {
    const message =
      error ||
      "Contract not found. The contract may not be indexed yet, or the backend may be unreachable.";
    return (
      <div className="min-h-screen bg-bg-primary">
        <Header onShowBookmarks={() => router.push("/")} bookmarkCount={bookmarks.length} />
        <div className="p-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-accent hover:text-accent-dim hover:underline mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to search
        </Link>
        <p className="text-red-400">{message}</p>
        <p className="mt-2 text-sm text-text-muted">
          Ensure the backend is running and the contract exists in the database.
        </p>
        </div>
      </div>
    );
  }

  const netKey = (contract.network || "").toLowerCase();
  const explorerUrl = EXPLORER_MAP[netKey]
    ? `${EXPLORER_MAP[netKey]}${contract.address}`
    : null;
  const deployTxHash = contract.deploy_tx_hash;
  const txExplorerUrl =
    deployTxHash && TX_EXPLORER_MAP[netKey]
      ? `${TX_EXPLORER_MAP[netKey]}${deployTxHash}`
      : null;
  const netColor = NETWORK_COLORS[netKey] ?? "bg-gray-500";

  return (
    <div className="min-h-screen bg-bg-primary bg-grid-overlay">
      <Header
        onShowBookmarks={() => router.push("/")}
        bookmarkCount={bookmarks.length}
      />
      <div className="max-w-6xl mx-auto p-4 lg:p-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-accent hover:text-accent-dim hover:underline mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to search
        </Link>

        <div className="space-y-6">
          {/** Header: name, address, network */}
          <div className="rounded-xl border border-border bg-bg-secondary p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-xl font-semibold text-text-primary">
                    {getContractName(contract)}
                  </h1>
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-medium text-white ${netColor}`}
                  >
                    {contract.network}
                  </span>
                  <Badge variant={contract.verified ? "success" : "muted"}>
                    {contract.verified ? "Verified" : "Unverified"}
                  </Badge>
                  {contract.is_proxy && <Badge variant="warning">Proxy</Badge>}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-4 font-mono text-sm">
                  <span className="text-text-muted">Address:</span>
                  {explorerUrl ? (
                    <a
                      href={explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent hover:text-accent-dim hover:underline"
                    >
                      {contract.address}
                    </a>
                  ) : (
                    <span className="text-text-primary">{contract.address}</span>
                  )}
                </div>
              </div>
              <div className="flex flex-shrink-0 w-[200px] min-w-[200px] overflow-hidden">
                <div className="grid h-[48px] grid-cols-1 grid-rows-1 gap-2 w-full min-w-0">
                  <div className="min-w-0 min-h-0 overflow-hidden h-full">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        if (isBookmarked(address, network)) {
                          await removeBookmark(address, network);
                          showToast?.("Bookmark removed.", "info");
                        } else {
                          await saveBookmark({ address, network, contract_name: getContractName(contract) });
                          showToast?.("Bookmark saved.", "success");
                        }
                      } catch {
                        showToast?.("Failed to update bookmark.", "error");
                      }
                    }}
                    className={ACTION_BUTTON_BASE}
                    aria-label={isBookmarked(address, network) ? "Remove bookmark" : "Add bookmark"}
                  >
                    {isBookmarked(address, network) ? (
                      <BookmarkCheck className="h-4 w-4 flex-shrink-0 fill-accent text-accent" />
                    ) : (
                      <Bookmark className="h-4 w-4 flex-shrink-0" />
                    )}
                    <span className="truncate">{isBookmarked(address, network) ? "Bookmarked" : "Bookmark"}</span>
                  </button>
                  </div>
                </div>
              </div>
            </div>
            {contract.is_proxy && contract.implementation_address && (
              <div className="mt-2 text-sm text-text-muted">
                Implementation:{" "}
                <span className="font-mono">{contract.implementation_address}</span>
              </div>
            )}
          </div>

          {/** Metadata grid */}
          <div className="rounded-xl border border-border bg-bg-secondary p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted mb-4">
              Contract Details
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-text-muted uppercase">Deployed</div>
                <div className="text-text-primary">
                  {formatContractDate(contract as Contract)}
                </div>
              </div>
              <div>
                <div className="text-xs text-text-muted uppercase">Native Balance</div>
                <div className="font-semibold text-accent">
                  {formatFund(contract as Contract, nativePrices || {})}
                </div>
              </div>
              <div>
                <div className="text-xs text-text-muted uppercase">Deploy TX</div>
                {txExplorerUrl ? (
                  <a
                    href={txExplorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline text-sm truncate block max-w-full"
                  >
                    {deployTxHash?.slice(0, 10)}...{deployTxHash?.slice(-8)}
                  </a>
                ) : (
                  <span className="text-text-muted">—</span>
                )}
              </div>
              <div>
                <div className="text-xs text-text-muted uppercase">Deployer</div>
                <div className="font-mono text-sm truncate">
                  {contract.deployer_address || "—"}
                </div>
              </div>
              <div>
                <div className="text-xs text-text-muted uppercase">Compiler</div>
                <div className="text-sm">
                  {contract.compiler_version || "—"}
                </div>
              </div>
              <div>
                <div className="text-xs text-text-muted uppercase">ERC-20 Tokens</div>
                <div className="text-sm">
                  <Erc20BalancesDisplay balances={Array.isArray(contract.erc20_balances) ? contract.erc20_balances : undefined} />
                </div>
              </div>
            </div>
          </div>

          {/** Source code */}
          {contract.source_code && (
            <div className="rounded-xl border border-border bg-bg-secondary overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-bg-tertiary">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted">
                  Source Code
                </h2>
              </div>
              <div className="overflow-x-auto">
                <pre className="m-0 p-4 text-xs leading-relaxed overflow-x-auto bg-bg-secondary font-mono text-text-primary whitespace-pre">
                  <code>{contract.source_code}</code>
                </pre>
              </div>
            </div>
          )}

          {!contract.source_code && (
            <div className="rounded-xl border border-border bg-bg-secondary p-6 text-text-muted">
              No source code available for this contract.
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
