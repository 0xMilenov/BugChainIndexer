"use client";

import { useCallback, useEffect, useState } from "react";
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
import { ArrowLeft, Bookmark, BookmarkCheck, ExternalLink } from "lucide-react";
import { Header } from "@/components/Header";
import { AuditSection } from "@/components/audits/AuditSection";

function getContractName(c: ContractDetail): string {
  const name = c?.contract_name?.trim();
  return name || "Unnamed Contract";
}

const EYEBROW = "font-data text-[12px] uppercase tracking-[0.12em]";
const BTN =
  "flex items-center justify-center gap-1.5 h-11 min-w-0 rounded-md border border-rule bg-ink-2 px-4 text-[13px] font-medium text-body transition-colors hover:border-rule-strong hover:bg-ink-3";

/** Dossier badge — small, data-font, bordered. */
function Tag({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "ok" | "warn";
}) {
  const cls =
    tone === "ok"
      ? "border-blue-600/40 bg-blue-950 text-blue-300"
      : tone === "warn"
        ? "border-sev-high/40 bg-sev-high/10 text-sev-high"
        : "border-rule bg-ink-2 text-faint";
  return (
    <span
      className={`inline-flex items-center rounded-[3px] border px-2 py-[3px] font-data text-[11px] uppercase tracking-[0.08em] ${cls}`}
    >
      {children}
    </span>
  );
}

function BackLink() {
  return (
    <Link
      href="/dashboard"
      className={`${EYEBROW} inline-flex items-center gap-2 text-faint transition-colors hover:text-blue-text`}
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      Back to the index
    </Link>
  );
}

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
  const { user, loginUrl } = useAuth();
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

  const shell = (inner: React.ReactNode) => (
    <div className="min-h-screen bg-ink-0 text-body">
      <Header onShowBookmarks={() => router.push("/")} bookmarkCount={bookmarks.length} />
      <div className="mx-auto max-w-6xl px-4 py-8 lg:px-6">
        <div className="mb-8">
          <BackLink />
        </div>
        {inner}
      </div>
    </div>
  );

  if (!address || !network) {
    return shell(<p className="text-dim">Invalid contract address or network.</p>);
  }

  if (loading) {
    return shell(
      <div className="space-y-4">
        <div className="skeleton h-10 w-72 rounded" />
        <div className="skeleton h-4 w-full rounded" />
        <div className="skeleton h-4 w-3/4 rounded" />
        <div className="skeleton mt-6 h-40 w-full rounded" />
      </div>
    );
  }

  if (error || !contract) {
    const message =
      error ||
      "Contract not found. It may not be indexed yet, or the backend may be unreachable.";
    return shell(
      <div className="border border-rule bg-ink-1 p-8">
        <div className={`${EYEBROW} text-sev-high`}>Not found</div>
        <p className="mt-3 text-body">{message}</p>
        <p className="mt-2 text-sm text-faint">
          Try searching for it from the index, or check that it exists on this network.
        </p>
      </div>
    );
  }

  const netKey = (contract.network || "").toLowerCase();
  const explorerUrl = EXPLORER_MAP[netKey] ? `${EXPLORER_MAP[netKey]}${contract.address}` : null;
  const deployTxHash = contract.deploy_tx_hash;
  const txExplorerUrl =
    deployTxHash && TX_EXPLORER_MAP[netKey] ? `${TX_EXPLORER_MAP[netKey]}${deployTxHash}` : null;
  const netColor = NETWORK_COLORS[netKey] ?? "bg-gray-500";
  const bookmarked = isBookmarked(address, network);
  const src = contract.source_code || "";
  const srcLines = src ? src.split("\n").length : 0;
  const srcKb = src ? (src.length / 1024).toFixed(1) : "0";

  return shell(
    <div className="space-y-6">
      {/* ── Subject header ── */}
      <div className="border border-rule bg-ink-1 d-rim">
        <div className="border-t-2 border-blue-600 px-6 pb-6 pt-5 sm:px-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="min-w-0">
              <div className={`${EYEBROW} flex items-center gap-2 text-blue-text`}>
                <span className={`inline-block h-2 w-2 rounded-full ${netColor}`} aria-hidden />
                Subject ·· {contract.network}
              </div>
              <h1 className="mt-3 font-serif text-[clamp(1.6rem,4vw,2.25rem)] leading-[1.1] text-paper">
                {getContractName(contract)}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Tag tone={contract.verified ? "ok" : "neutral"}>
                  {contract.verified ? "Verified" : "Unverified"}
                </Tag>
                {contract.is_proxy && <Tag tone="warn">Proxy</Tag>}
              </div>

              <div className="mt-5">
                <div className={`${EYEBROW} text-faint`}>Address</div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {explorerUrl ? (
                    <a
                      href={explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 break-all font-data text-[13px] text-blue-text hover:text-blue-300"
                    >
                      {contract.address}
                      <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-70" />
                    </a>
                  ) : (
                    <span className="break-all font-data text-[13px] text-dim">{contract.address}</span>
                  )}
                </div>
                {contract.is_proxy && contract.implementation_address && (
                  <div className="mt-3">
                    <div className={`${EYEBROW} text-faint`}>Implementation</div>
                    <div className="mt-1 break-all font-data text-[13px] text-dim">
                      {contract.implementation_address}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={async () => {
                if (!user) {
                  router.push(loginUrl);
                  return;
                }
                try {
                  if (bookmarked) {
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
              className={`${BTN} shrink-0 ${bookmarked ? "border-blue-600/50 text-blue-text" : ""}`}
              aria-label={bookmarked ? "Remove bookmark" : "Add bookmark"}
            >
              {bookmarked ? (
                <BookmarkCheck className="h-4 w-4 fill-blue-600 text-blue-600" />
              ) : (
                <Bookmark className="h-4 w-4" />
              )}
              <span>{bookmarked ? "Bookmarked" : "Bookmark"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Metadata register ── */}
      <div className="border border-rule bg-ink-1">
        <div className={`${EYEBROW} border-b border-rule px-6 py-3 text-faint`}>
          Contract details
        </div>
        <dl className="grid grid-cols-1 divide-y divide-rule-dot sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-3">
          <Field label="Deployed" value={formatContractDate(contract as Contract)} />
          <Field
            label="Native balance"
            value={formatFund(contract as Contract, nativePrices || {})}
            accent
          />
          <Field
            label="Deploy tx"
            value={
              txExplorerUrl ? (
                <a
                  href={txExplorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-data text-[13px] text-blue-text hover:text-blue-300"
                >
                  {deployTxHash?.slice(0, 10)}…{deployTxHash?.slice(-8)}
                </a>
              ) : (
                "—"
              )
            }
          />
          <Field
            label="Deployer"
            value={
              contract.deployer_address ? (
                <span className="break-all font-data text-[13px] text-dim">
                  {contract.deployer_address}
                </span>
              ) : (
                "—"
              )
            }
          />
          <Field label="Compiler" value={contract.compiler_version || "—"} mono />
          <Field
            label="ERC-20 tokens"
            value={
              <Erc20BalancesDisplay
                balances={Array.isArray(contract.erc20_balances) ? contract.erc20_balances : undefined}
              />
            }
          />
        </dl>
      </div>

      {/* ── Findings ── */}
      <AuditSection address={address} network={network} />

      {/* ── Source code ── */}
      {src ? (
        <div className="overflow-hidden border border-rule bg-ink-1">
          <div className="flex items-center justify-between border-b border-rule bg-ink-2 px-6 py-3">
            <span className={`${EYEBROW} text-faint`}>Source code</span>
            <span className="font-data text-[11px] tabular-nums text-ghost">
              {srcLines.toLocaleString()} lines · {srcKb} KB
            </span>
          </div>
          <div className="d-groove max-h-[70vh] overflow-auto">
            <pre className="m-0 whitespace-pre p-5 font-data text-[12px] leading-[1.6] text-dim">
              <code>{src}</code>
            </pre>
          </div>
        </div>
      ) : (
        <div className="border border-rule bg-ink-1 p-6 text-faint">
          No source code available for this contract.
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  accent,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  accent?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="border-rule-dot px-6 py-4 sm:border-b sm:[&:nth-last-child(-n+1)]:border-b-0 lg:border-r lg:[&:nth-child(3n)]:border-r-0">
      <dt className="font-data text-[11px] uppercase tracking-[0.1em] text-faint">{label}</dt>
      <dd
        className={`mt-1.5 text-[14px] ${
          accent ? "font-data font-semibold text-blue-text" : mono ? "font-data text-dim" : "text-body"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
