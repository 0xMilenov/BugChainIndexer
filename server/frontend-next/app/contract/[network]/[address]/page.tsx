"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { getContract, getContractReports, startAudit, importEvmbenchJob, saveManualAuditReport, saveManualReconReport } from "@/lib/api";
import type { ContractDetail, AuditReport, FuzzReport, EvmbenchJob } from "@/lib/api";
import type { Contract } from "@/types/contract";
import { formatContractDate, formatFund } from "@/lib/contract-utils";
import { Erc20BalancesDisplay } from "@/components/results/Erc20BalancesDisplay";
import { useNativePrices } from "@/hooks/useNativePrices";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useShowToast } from "@/context/ToastContext";
import { EXPLORER_MAP, TX_EXPLORER_MAP, NETWORK_COLORS } from "@/lib/constants";
import { ArrowLeft, ExternalLink, ShieldCheck, Bug, Bookmark, BookmarkCheck } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { AuditModal } from "@/components/AuditModal";
import { AuditProgressModal } from "@/components/AuditProgressModal";
import { AuditResultsModal } from "@/components/AuditResultsModal";
import { ImportEvmbenchJobModal } from "@/components/ImportEvmbenchJobModal";
import { VulnerabilityCard } from "@/components/VulnerabilityCard";
import { ManualReportModal } from "@/components/ManualReportModal";
import ReactMarkdown from "react-markdown";

function getContractName(c: ContractDetail): string {
  const name = c?.contract_name?.trim();
  return name || "Unnamed Contract";
}

export default function ContractDetailPage() {
  const params = useParams();
  const network = params?.network as string;
  const address = params?.address as string;
  const [contract, setContract] = useState<ContractDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [auditProgressModalOpen, setAuditProgressModalOpen] = useState(false);
  const [auditResultsModalOpen, setAuditResultsModalOpen] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditReport, setAuditReport] = useState<AuditReport | null>(null);
  const [evmbenchJob, setEvmbenchJob] = useState<EvmbenchJob | null>(null);
  const [fuzzReport, setFuzzReport] = useState<FuzzReport | null>(null);
  const [importEvmbenchModalOpen, setImportEvmbenchModalOpen] = useState(false);
  const [importEvmbenchLoading, setImportEvmbenchLoading] = useState(false);
  const [manualAuditModalOpen, setManualAuditModalOpen] = useState(false);
  const [manualReconModalOpen, setManualReconModalOpen] = useState(false);
  const [manualAuditLoading, setManualAuditLoading] = useState(false);
  const [manualReconLoading, setManualReconLoading] = useState(false);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const nativePrices = useNativePrices();
  const { saveBookmark, removeBookmark, isBookmarked } = useBookmarks();
  const showToast = useShowToast();

  const fetchReports = useCallback(async () => {
    if (!address || !network) return;
    try {
      const resp = await getContractReports(address, network);
      setAuditReport(resp.ok && resp.auditReport ? resp.auditReport : null);
      setFuzzReport(resp.ok && resp.fuzzReport ? resp.fuzzReport : null);
      setEvmbenchJob(resp.ok && resp.evmbenchJob ? resp.evmbenchJob : null);
    } catch {
      setAuditReport(null);
      setFuzzReport(null);
      setEvmbenchJob(null);
    }
  }, [address, network]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  useEffect(() => {
    if (auditReport?.status === "pending" || auditProgressModalOpen) {
      const interval = auditProgressModalOpen ? 2000 : 5000;
      pollIntervalRef.current = setInterval(fetchReports, interval);
      return () => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      };
    }
  }, [auditReport?.status, auditProgressModalOpen, fetchReports]);

  const handleAuditSubmit = useCallback(
    async (openaiKey: string, model: string) => {
      if (!address || !network) return;
      setAuditLoading(true);
      try {
        const result = await startAudit(address, network, openaiKey, model);
        await fetchReports();
        if (result.ok && result.auditReport) {
          setAuditReport(result.auditReport);
          setAuditModalOpen(false);
          setAuditProgressModalOpen(true);
        }
      } finally {
        setAuditLoading(false);
      }
    },
    [address, network, fetchReports]
  );

  const handleImportEvmbenchJob = useCallback(
    async (evmbenchJobId: string) => {
      if (!address || !network) return;
      setImportEvmbenchLoading(true);
      try {
        await importEvmbenchJob(address, network, evmbenchJobId);
        await fetchReports();
        showToast?.("evmbench job imported.", "success");
      } finally {
        setImportEvmbenchLoading(false);
      }
    },
    [address, network, fetchReports, showToast]
  );

  const handleManualAuditSubmit = useCallback(
    async (markdown: string) => {
      if (!address || !network) return;
      setManualAuditLoading(true);
      try {
        await saveManualAuditReport(address, network, markdown);
        await fetchReports();
        showToast?.("Manual AI audit report saved.", "success");
      } finally {
        setManualAuditLoading(false);
      }
    },
    [address, network, fetchReports, showToast]
  );

  const handleManualReconSubmit = useCallback(
    async (markdown: string) => {
      if (!address || !network) return;
      setManualReconLoading(true);
      try {
        await saveManualReconReport(address, network, markdown);
        await fetchReports();
        showToast?.("Manual recon report saved.", "success");
      } finally {
        setManualReconLoading(false);
      }
    },
    [address, network, fetchReports, showToast]
  );

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
      <div className="min-h-screen bg-bg-primary p-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-accent hover:text-accent-dim hover:underline mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to search
        </Link>
        <p className="text-text-muted">Invalid contract address or network.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary p-6">
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
    );
  }

  if (error || !contract) {
    const message =
      error ||
      "Contract not found. The contract may not be indexed yet, or the backend may be unreachable.";
    return (
      <div className="min-h-screen bg-bg-primary p-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-accent hover:text-accent-dim hover:underline mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to search
        </Link>
        <p className="text-red-400">{message}</p>
        <p className="mt-2 text-sm text-text-muted">
          Ensure the backend is running on port 8000 and the contract exists in the database.
        </p>
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
      <AuditModal
        open={auditModalOpen}
        onClose={() => setAuditModalOpen(false)}
        onSubmit={handleAuditSubmit}
        loading={auditLoading}
      />
      <AuditProgressModal
        open={auditProgressModalOpen}
        onClose={() => setAuditProgressModalOpen(false)}
        auditReport={auditReport}
        evmbenchJob={evmbenchJob}
        contractFileName={contract?.contract_file_name || contract?.contract_name}
      />
      <AuditResultsModal
        open={auditResultsModalOpen}
        onClose={() => setAuditResultsModalOpen(false)}
        auditReport={auditReport}
      />
      <ImportEvmbenchJobModal
        open={importEvmbenchModalOpen}
        onClose={() => setImportEvmbenchModalOpen(false)}
        onSubmit={handleImportEvmbenchJob}
        loading={importEvmbenchLoading}
      />
      <ManualReportModal
        open={manualAuditModalOpen}
        onClose={() => setManualAuditModalOpen(false)}
        onSubmit={handleManualAuditSubmit}
        title="Add Manual AI Audit"
        loading={manualAuditLoading}
      />
      <ManualReportModal
        open={manualReconModalOpen}
        onClose={() => setManualReconModalOpen(false)}
        onSubmit={handleManualReconSubmit}
        title="Add Manual Recon"
        loading={manualReconLoading}
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
                  <span className="text-text-primary">{contract.address}</span>
                  {explorerUrl && (
                    <a
                      href={explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-accent hover:text-accent-dim hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      View on explorer
                    </a>
                  )}
                </div>
              </div>
              <div className="flex flex-shrink-0 flex-col gap-2">
                <div className="flex gap-3">
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
                    className="inline-flex items-center gap-2 rounded-lg border border-border bg-bg-tertiary px-4 py-2 text-sm font-medium text-text-primary transition hover:border-accent/40 hover:bg-accent/10"
                    aria-label={isBookmarked(address, network) ? "Remove bookmark" : "Add bookmark"}
                  >
                    {isBookmarked(address, network) ? (
                      <BookmarkCheck className="h-4 w-4 fill-accent text-accent" />
                    ) : (
                      <Bookmark className="h-4 w-4" />
                    )}
                    {isBookmarked(address, network) ? "Bookmarked" : "Bookmark"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (auditReport?.status === "completed") {
                        setAuditResultsModalOpen(true);
                      } else if (auditReport?.status === "pending") {
                        setAuditProgressModalOpen(true);
                      } else {
                        setAuditModalOpen(true);
                      }
                    }}
                    className={
                      auditReport?.status === "completed"
                        ? "inline-flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-400 transition hover:border-emerald-500/60 hover:bg-emerald-500/30"
                        : "inline-flex items-center gap-2 rounded-lg border border-border bg-bg-tertiary px-4 py-2 text-sm font-medium text-text-primary transition hover:border-accent/40 hover:bg-accent/10"
                    }
                  >
                    <ShieldCheck className="h-4 w-4" />
                    {auditReport?.status === "pending"
                      ? "In progress..."
                      : "AI Audit"}
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-lg border border-border bg-bg-tertiary px-4 py-2 text-sm font-medium text-text-primary transition hover:border-accent/40 hover:bg-accent/10"
                    disabled
                    title="Coming soon"
                  >
                    <Bug className="h-4 w-4" />
                    Get Recon
                  </button>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setImportEvmbenchModalOpen(true)}
                    className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-bg-tertiary/80 px-3 py-1.5 text-xs font-medium text-text-muted transition hover:border-accent/40 hover:bg-accent/10 hover:text-text-primary"
                  >
                    Import evmbench Job
                  </button>
                  <button
                    type="button"
                    onClick={() => setManualAuditModalOpen(true)}
                    className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-bg-tertiary/80 px-3 py-1.5 text-xs font-medium text-text-muted transition hover:border-accent/40 hover:bg-accent/10 hover:text-text-primary"
                  >
                    Add Manual AI Audit
                  </button>
                  <button
                    type="button"
                    onClick={() => setManualReconModalOpen(true)}
                    className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-bg-tertiary/80 px-3 py-1.5 text-xs font-medium text-text-muted transition hover:border-accent/40 hover:bg-accent/10 hover:text-text-primary"
                  >
                    Add Manual Recon
                  </button>
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
                  <Erc20BalancesDisplay balances={contract.erc20_balances} />
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
                <SyntaxHighlighter
                  language="javascript"
                  style={oneDark}
                  customStyle={{
                    margin: 0,
                    padding: "1rem",
                    background: "var(--bg-secondary)",
                    fontSize: "0.75rem",
                    lineHeight: 1.5,
                  }}
                  codeTagProps={{ style: { fontFamily: "var(--font-geist-sans)" } }}
                  showLineNumbers
                >
                  {contract.source_code}
                </SyntaxHighlighter>
              </div>
            </div>
          )}

          {!contract.source_code && (
            <div className="rounded-xl border border-border bg-bg-secondary p-6 text-text-muted">
              No source code available for this contract.
            </div>
          )}

          {/** AI Audit Report */}
          {auditReport && (
            <div className="rounded-xl border border-border bg-bg-secondary overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-bg-tertiary">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted">
                  AI Audit Report
                </h2>
                <div className="mt-1 flex flex-wrap gap-2">
                  <Badge
                    variant={
                      auditReport.status === "completed"
                        ? "success"
                        : auditReport.status === "failed"
                          ? "warning"
                          : "muted"
                    }
                  >
                    {auditReport.status === "pending"
                      ? "In progress..."
                      : auditReport.status === "completed"
                        ? "Completed"
                        : auditReport.status === "failed"
                          ? "Failed"
                          : auditReport.status}
                  </Badge>
                  {auditReport.report_json?.manual && (
                    <Badge variant="muted">Manual</Badge>
                  )}
                </div>
              </div>
              <div className="p-4">
                {auditReport.status === "pending" && (
                  <p className="text-text-muted text-sm">
                    Audit is running. This may take several minutes. The page will
                    update automatically.
                  </p>
                )}
                {auditReport.status === "failed" && (
                  <p className="text-red-400 text-sm">
                    {auditReport.raw_output || "Audit failed"}
                  </p>
                )}
                {auditReport.status === "completed" && auditReport.report_json?.manual && (
                  <div className="markdown-content text-sm text-text-primary [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:text-base [&_h2]:font-semibold [&_h3]:text-sm [&_h3]:font-medium [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-2 [&_pre]:bg-bg-tertiary [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_code]:bg-bg-tertiary [&_code]:px-1 [&_code]:rounded [&_a]:text-accent [&_a]:hover:underline">
                    <ReactMarkdown>{auditReport.report_json.markdown || ""}</ReactMarkdown>
                  </div>
                )}
                {auditReport.status === "completed" &&
                  !auditReport.report_json?.manual &&
                  auditReport.report_json?.vulnerabilities && (
                    <div className="space-y-3">
                      {auditReport.report_json.vulnerabilities.length === 0 ? (
                        <p className="text-text-muted text-sm">
                          No vulnerabilities found.
                        </p>
                      ) : (
                        auditReport.report_json.vulnerabilities.map((vuln, idx) => (
                          <VulnerabilityCard key={idx} vuln={vuln} />
                        ))
                      )}
                    </div>
                  )}
              </div>
            </div>
          )}

          {/** Get Recon Report */}
          {fuzzReport && (
            <div className="rounded-xl border border-border bg-bg-secondary overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-bg-tertiary">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted">
                  Get Recon Report
                </h2>
                <div className="mt-1 flex flex-wrap gap-2">
                  <Badge
                    variant={
                      fuzzReport.status === "completed"
                        ? "success"
                        : fuzzReport.status === "failed"
                          ? "warning"
                          : "muted"
                    }
                  >
                    {fuzzReport.status === "pending"
                      ? "In progress..."
                      : fuzzReport.status === "completed"
                        ? "Completed"
                        : fuzzReport.status === "failed"
                          ? "Failed"
                          : fuzzReport.status}
                  </Badge>
                  {fuzzReport.report_json?.manual && (
                    <Badge variant="muted">Manual</Badge>
                  )}
                </div>
              </div>
              <div className="p-4">
                {fuzzReport.status === "pending" && (
                  <p className="text-text-muted text-sm">
                    Fuzzing campaign is running. This may take several minutes.
                  </p>
                )}
                {fuzzReport.status === "failed" && (
                  <p className="text-red-400 text-sm">
                    {fuzzReport.raw_output || "Fuzzing failed"}
                  </p>
                )}
                {fuzzReport.status === "completed" && fuzzReport.report_json?.manual && (
                  <div className="markdown-content text-sm text-text-primary [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:text-base [&_h2]:font-semibold [&_h3]:text-sm [&_h3]:font-medium [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-2 [&_pre]:bg-bg-tertiary [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_code]:bg-bg-tertiary [&_code]:px-1 [&_code]:rounded [&_a]:text-accent [&_a]:hover:underline">
                    <ReactMarkdown>{fuzzReport.report_json.markdown || ""}</ReactMarkdown>
                  </div>
                )}
                {fuzzReport.status === "completed" &&
                  !fuzzReport.report_json?.manual &&
                  fuzzReport.report_json && (
                    <pre className="text-sm text-text-muted overflow-x-auto p-4 rounded-lg bg-bg-tertiary">
                      {JSON.stringify(fuzzReport.report_json, null, 2)}
                    </pre>
                  )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
