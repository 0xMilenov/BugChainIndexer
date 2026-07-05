"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Layout } from "@/components/Layout";
import { Sidebar } from "@/components/Sidebar";
import { ResultsTable } from "@/components/results/ResultsTable";
import { ResultsCards } from "@/components/results/ResultsCards";
import { LoadingSkeleton } from "@/components/results/LoadingSkeleton";
import { EmptyState } from "@/components/results/EmptyState";
import { ErrorState } from "@/components/results/ErrorState";
import { Pagination } from "@/components/results/Pagination";
import { FilterProvider, useFilters } from "@/context/FilterContext";
import { useAuth } from "@/context/AuthContext";
import { useShowToast } from "@/context/ToastContext";
import { useSearchContracts } from "@/hooks/useSearchContracts";
import { useBookmarks } from "@/hooks/useBookmarks";
import { searchByCode, addContract, getDailyCollectionStats, getScannerHealth } from "@/lib/api";
import type { DailyCollectionStats, ScannerHealth } from "@/lib/api";
import { useNativePrices } from "@/hooks/useNativePrices";
import { sortResults } from "@/lib/sort";
import {
  getCanonicalContractName,
  isVerifiedContract,
  isProxyContract,
  getImplementationAddress,
  getDeployTxHash,
  getDeployerAddress,
  getContractTimestamp,
  formatErc20Balances,
  formatFund,
} from "@/lib/contract-utils";
import type { Contract } from "@/types/contract";
import { Activity, CalendarDays, Clock, Info, RadioTower, Trophy } from "lucide-react";
import { AddContractModal } from "@/components/AddContractModal";
import { Button } from "@/components/ui/Button";
import { FUND_UI_MAX, NETWORK_DISPLAY_NAMES } from "@/lib/constants";
import { Suspense } from "react";

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function formatTimestamp(ts?: number | null) {
  if (!ts) return "-";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ts * 1000));
}

function formatDurationMs(ms?: number | null) {
  if (!ms) return "-";
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${ms}ms`;
}

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const showToast = useShowToast();
  const { user, loginUrl, refreshAuth } = useAuth();

  useEffect(() => {
    const authError = searchParams.get("auth_error");
    if (authError) {
      router.replace(`/auth/error?message=${encodeURIComponent(authError)}`);
    }
  }, [searchParams, router]);

  useEffect(() => {
    if (searchParams.get("from") === "login") {
      refreshAuth().then(() => router.replace("/", { scroll: false }));
    }
  }, [searchParams, refreshAuth, router]);

  const {
    filters,
    clearFilters,
    filterBadgeCount,
    networkButtonCount,
  } = useFilters();
  const { bookmarks, saveBookmark, removeBookmark, isBookmarked } = useBookmarks();
  const nativePrices = useNativePrices();

  // Default to 'severity': audited contracts first (ordered by critical → high
  // → medium DESC), then non-audited by native balance DESC. sortColumn is
  // initialized to 'severity' so no individual table column shows an active
  // sort indicator on first paint (no column header maps to this composite).
  const [sortBy, setSortBy] = useState<"fund" | "first_seen" | "severity" | null>("severity");
  const [sortColumn, setSortColumn] = useState("severity");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [hideDuplicates, setHideDuplicates] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [viewingBookmarks, setViewingBookmarks] = useState(false);
  const [codeSnippet, setCodeSnippet] = useState("");
  const [codeSearchResults, setCodeSearchResults] = useState<typeof results>([]);
  const [codeSearchMode, setCodeSearchMode] = useState(false);
  const [codeSearchLoading, setCodeSearchLoading] = useState(false);
  const [codeSearchError, setCodeSearchError] = useState<string | null>(null);
  const [addContractModalOpen, setAddContractModalOpen] = useState(false);
  const [dailyStats, setDailyStats] = useState<DailyCollectionStats | null>(null);
  const [dailyStatsLoading, setDailyStatsLoading] = useState(true);
  const [scannerHealth, setScannerHealth] = useState<ScannerHealth | null>(null);
  const [scannerHealthLoading, setScannerHealthLoading] = useState(true);

  const {
    results,
    loading,
    error,
    totalCount,
    totalPages,
    nextCursor,
    hasSearched,
    cursorStack,
    runSearch,
    goPrev,
    goNext,
  } = useSearchContracts(filters, hideDuplicates, sortBy);

  const displayResults = codeSearchMode
    ? codeSearchResults
    : viewingBookmarks
      ? bookmarks
      : results;
  const sortedResults = useMemo(() => {
    if (sortBy && !viewingBookmarks) return displayResults;
    return sortResults(displayResults, sortColumn, sortDirection);
  }, [displayResults, sortBy, sortColumn, sortDirection, viewingBookmarks]);

  const contractCount = useMemo(() => {
    if (codeSearchMode) return `Code Search: ${codeSearchResults.length} matches`;
    if (viewingBookmarks) return `Bookmarks: ${bookmarks.length}`;
    if (!hasSearched) return "Total Contracts: 0";
    if (totalCount != null)
      return `Total Contracts: ${totalCount}` + (totalPages ? ` (pages: ${totalPages})` : "");
    return `Contracts (this page): ${sortedResults.length}`;
  }, [codeSearchMode, codeSearchResults.length, viewingBookmarks, bookmarks.length, hasSearched, totalCount, totalPages, sortedResults.length]);

  const resultsMeta = useMemo(() => {
    if (codeSearchMode) {
      if (codeSearchLoading) return "Searching contracts by code...";
      if (codeSearchResults.length === 0) return "No contracts match this code snippet.";
      return `Found ${codeSearchResults.length} contract(s) matching your code snippet.`;
    }
    if (viewingBookmarks) return `Showing ${bookmarks.length} bookmarked contracts.`;
    if (!hasSearched) return "Set your filters and start searching contracts.";
    if (results.length === 0 && !loading) return "No matching contracts. Try broadening your filters.";
    if (loading) return "Fetching contracts from the indexer...";
    const pageIndex = cursorStack.length + 1;
    return `Showing ${sortedResults.length} contracts on page ${pageIndex}${totalCount != null ? ` of ${totalCount} total` : ""}.`;
  }, [codeSearchMode, codeSearchLoading, codeSearchResults.length, viewingBookmarks, bookmarks.length, hasSearched, results.length, loading, sortedResults.length, cursorStack.length, totalCount]);

  const dailyTopContract = dailyStats?.top_contract ?? null;
  const dailyTopContractName = dailyTopContract
    ? getCanonicalContractName(dailyTopContract as Contract)
    : null;
  const dailyTopNetwork = dailyTopContract?.network?.toLowerCase() ?? "";
  const dailyTopNetworkLabel =
    NETWORK_DISPLAY_NAMES[dailyTopNetwork] ?? dailyTopContract?.network ?? "";
  const dailyTopValue = dailyTopContract
    ? formatFund(dailyTopContract as Contract, nativePrices)
    : "-";
  const dailyNetworkSummary =
    dailyStats?.by_network
      ?.slice(0, 3)
      .map((n) => `${NETWORK_DISPLAY_NAMES[n.network] ?? n.network}: ${n.count}`)
      .join(" • ") || "";
  const scannerStatus = scannerHealthLoading
    ? "Checking"
    : scannerHealth?.running
      ? `Running (${scannerHealth.running_count})`
      : "Idle";
  const scannerLastRun =
    scannerHealth?.runner?.last_start?.timestamp ||
    scannerHealth?.recent_networks?.[0]?.updated_at ||
    null;
  const scannerRecentNetworks =
    scannerHealth?.recent_networks
      ?.slice(0, 4)
      .map((n) => `${NETWORK_DISPLAY_NAMES[n.network] ?? n.network}: ${n.get_logs_requests} RPC`)
      .join(" • ") || "";
  const scannerNextRun = scannerHealth?.cron?.next_run_at ?? null;
  const scannerCronJobs = scannerHealth?.cron?.jobs?.length ?? (scannerHealth?.cron?.enabled ? 1 : 0);
  const scannerRpcAverage = scannerHealth?.rpc?.avg_get_logs_ms ?? null;
  const scannerErrors = scannerHealth?.rpc?.errors ?? 0;

  const updateURL = useCallback(() => {
    const params = new URLSearchParams();
    if (filters.address) params.set("address", filters.address);
    if (filters.name) params.set("name", filters.name);
    if (filters.timeMin !== 0) params.set("timeMin", String(filters.timeMin));
    if (filters.timeMax !== 12) params.set("timeMax", String(filters.timeMax));
    if (filters.fundMin !== 0) params.set("fundMin", String(filters.fundMin));
    if (filters.fundMax !== FUND_UI_MAX) params.set("fundMax", String(filters.fundMax));
    if (filters.networks.length > 0) params.set("networks", filters.networks.join(","));
    const qs = params.toString();
    const url = qs ? `?${qs}` : window.location.pathname;
    router.replace(url);
  }, [filters, router]);

  const handleSearch = useCallback(() => {
    setCodeSearchMode(false);
    setViewingBookmarks(false);
    updateURL();
    runSearch();
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, [updateURL, runSearch]);

  const handleCodeSearch = useCallback(async () => {
    const snippet = codeSnippet.trim();
    if (snippet.length < 5) {
      showToast("Enter at least 5 characters to search.", "error");
      return;
    }
    setCodeSearchLoading(true);
    setCodeSearchError(null);
    try {
      const resp = await searchByCode({
        codeSnippet: snippet,
        limit: 50,
        networks: filters.networks.length > 0 ? filters.networks.join(",") : undefined,
      });
      setCodeSearchResults(resp.matches ?? []);
      setCodeSearchMode(true);
      setViewingBookmarks(false);
      if (typeof window !== "undefined" && window.innerWidth < 1024) {
        setSidebarOpen(false);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Code search failed.";
      setCodeSearchError(msg);
      showToast(msg, "error");
    } finally {
      setCodeSearchLoading(false);
    }
  }, [codeSnippet, filters.networks, showToast]);

  const handleClearFilters = useCallback(() => {
    clearFilters();
    router.replace(window.location.pathname);
    showToast("Active filters cleared.", "success");
  }, [clearFilters, router, showToast]);

  const handleBookmarkToggle = useCallback(
    async (contract: { address: string; network: string }) => {
      if (!user) {
        router.push(loginUrl);
        return;
      }
      try {
        if (isBookmarked(contract.address, contract.network)) {
          await removeBookmark(contract.address, contract.network);
          showToast("Bookmark removed.", "info");
        } else {
          await saveBookmark(contract);
          showToast("Bookmark saved.", "success");
        }
      } catch {
        showToast("Failed to update bookmark.", "error");
      }
    },
    [isBookmarked, loginUrl, removeBookmark, router, saveBookmark, showToast, user]
  );

  const handleShowBookmarks = useCallback(() => {
    if (!user) {
      router.push(loginUrl);
      return;
    }
    if (bookmarks.length === 0) {
      showToast("No bookmarks saved yet.", "info");
      return;
    }
    setViewingBookmarks(true);
  }, [bookmarks.length, loginUrl, router, showToast, user]);

  const handleColumnSort = useCallback((col: string) => {
    setSortBy(null);
    if (sortColumn === col) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(col);
      setSortDirection(
        ["fund", "deployed", "discovered"].includes(col) ? "desc" : "asc"
      );
    }
  }, [sortColumn]);

  const exportToCSV = useCallback(() => {
    if (sortedResults.length === 0) {
      showToast("No data to export yet.", "error");
      return;
    }
    const headers = [
      "Address",
      "Contract Name",
      "Network",
      "Deployed",
      "Verified",
      "Is Proxy",
      "Implementation Address",
      "Deploy TX Hash",
      "Deployer Address",
      "Confidence",
      "Native",
      "ERC-20 Tokens",
    ];
    const rows = sortedResults.map((r) => [
      r.address || "",
      getCanonicalContractName(r),
      r.network || "",
      getContractTimestamp(r) ? new Date(getContractTimestamp(r)! * 1000).toISOString() : "",
      isVerifiedContract(r) ? "true" : "false",
      isProxyContract(r) ? "true" : "false",
      getImplementationAddress(r) || "",
      getDeployTxHash(r) || "",
      getDeployerAddress(r) || "",
      r.confidence || "",
      r.fund || "",
      formatErc20Balances(r.erc20_balances, 99),
    ]);
    const csvContent = [headers, ...rows]
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const ts = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
    downloadFile(csvContent, `visualisa-contracts-${ts}.csv`, "text/csv");
    showToast(`Exported ${rows.length} rows to CSV.`, "success");
    setExportMenuOpen(false);
  }, [sortedResults, showToast]);

  const exportToJSON = useCallback(() => {
    if (sortedResults.length === 0) {
      showToast("No data to export yet.", "error");
      return;
    }
    const jsonContent = JSON.stringify(sortedResults, null, 2);
    const ts = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
    downloadFile(jsonContent, `visualisa-contracts-${ts}.json`, "application/json");
    showToast(`Exported ${sortedResults.length} rows to JSON.`, "success");
    setExportMenuOpen(false);
  }, [sortedResults, showToast]);

  useEffect(() => {
    const t = setTimeout(() => runSearch(), 100);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 1);

    setDailyStatsLoading(true);
    getDailyCollectionStats({
      from: Math.floor(start.getTime() / 1000),
      to: Math.floor(end.getTime() / 1000),
    })
      .then((stats) => {
        if (!cancelled) setDailyStats(stats);
      })
      .catch(() => {
        if (!cancelled) setDailyStats(null);
      })
      .finally(() => {
        if (!cancelled) setDailyStatsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;

    const loadScannerHealth = () => {
      setScannerHealthLoading(true);
      getScannerHealth()
        .then((health) => {
          if (!cancelled) setScannerHealth(health);
        })
        .catch(() => {
          if (!cancelled) setScannerHealth(null);
        })
        .finally(() => {
          if (!cancelled) setScannerHealthLoading(false);
        });
    };

    loadScannerHealth();
    interval = setInterval(loadScannerHealth, 30000);

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      const inEditable = tag === "input" || tag === "textarea";
      if (e.key === "/" && !inEditable) {
        e.preventDefault();
        document.getElementById("address-search")?.focus();
      } else if ((e.key === "n" || e.key === "N") && !inEditable && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        document.getElementById("name-search")?.focus();
      } else if (e.key === "Escape") {
        setSidebarOpen(false);
        setExportMenuOpen(false);
        setAddContractModalOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (exportMenuOpen && !target.closest("[data-export-menu]") && !target.closest("[data-export-btn]")) {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [exportMenuOpen]);

  return (
    <Layout
      headerProps={{
        onToggleFilters: () => setSidebarOpen((p) => !p),
        sidebarOpen,
        filterBadgeCount,
        onShowBookmarks: handleShowBookmarks,
        bookmarkCount: bookmarks.length,
      }}
      sidebarProps={{
        onSearch: handleSearch,
        onExportCSV: exportToCSV,
        onExportJSON: exportToJSON,
        exportMenuOpen,
        onExportMenuToggle: () => setExportMenuOpen((p) => !p),
        hasExportData: sortedResults.length > 0,
        onClearFilters: handleClearFilters,
        open: sidebarOpen,
        onClose: () => setSidebarOpen(false),
        codeSnippet,
        onCodeSnippetChange: setCodeSnippet,
        onCodeSearch: handleCodeSearch,
        codeSearchLoading,
      }}
      sidebarOpen={sidebarOpen}
      onSidebarOpenChange={setSidebarOpen}
    >
      <div className="mb-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-sm text-faint transition-[padding] duration-200 ${
              !sidebarOpen ? "pl-14 lg:pl-16" : ""
            }`}
          >
            {resultsMeta}
          </span>
          {viewingBookmarks && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setViewingBookmarks(false)}
            >
              Back to search
            </Button>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="group relative">
            <span
              className="inline-flex text-faint hover:text-body transition cursor-default"
              aria-label="Don't see the contract you need? Add it manually."
            >
              <Info className="h-4 w-4" />
            </span>
            <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden whitespace-nowrap rounded bg-ink-2 px-2.5 py-1.5 text-xs text-body shadow-lg border border-rule group-hover:block z-50">
              Don&apos;t see the contract you need? Add it manually.
            </span>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setAddContractModalOpen(true)}
          >
            Add Contract Manually
          </Button>
        </div>
      </div>
      <section className="mb-4 rounded-lg border border-rule bg-ink-1 px-4 py-3">
        <div className="grid gap-4 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] md:items-center">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-blue-600/30 bg-blue-600/10 text-blue-text">
              <CalendarDays className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-wide text-faint">
                Today
              </div>
              <div className="mt-1 text-2xl font-semibold tabular-nums text-body">
                {dailyStatsLoading
                  ? "..."
                  : (dailyStats?.total ?? 0).toLocaleString("en-US")}
              </div>
              <div className="mt-1 text-xs text-faint">
                {dailyStatsLoading
                  ? "Loading daily collection..."
                  : `${(dailyStats?.verified ?? 0).toLocaleString("en-US")} verified • ${(dailyStats?.networks ?? 0).toLocaleString("en-US")} networks${dailyNetworkSummary ? ` • ${dailyNetworkSummary}` : ""}`}
              </div>
            </div>
          </div>
          <div className="flex min-w-0 items-start gap-3 border-t border-rule pt-3 md:border-l md:border-t-0 md:pl-4 md:pt-0">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-rule bg-ink-2 text-faint">
              <Trophy className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-wide text-faint">
                Largest today
              </div>
              {dailyTopContract ? (
                <>
                  <Link
                    href={`/contract/${dailyTopContract.network}/${dailyTopContract.address}`}
                    className="mt-1 block truncate text-sm font-semibold text-blue-text hover:underline"
                    title={dailyTopContract.address}
                  >
                    {dailyTopContractName || dailyTopContract.address}
                  </Link>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-faint">
                    <span>{dailyTopValue}</span>
                    <span>{dailyTopNetworkLabel}</span>
                    <span className="font-data">
                      {dailyTopContract.address.slice(0, 6)}...
                      {dailyTopContract.address.slice(-4)}
                    </span>
                  </div>
                </>
              ) : (
                <div className="mt-1 text-sm text-faint">
                  {dailyStatsLoading ? "Checking..." : "No contracts collected yet."}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
      <section className="mb-4 rounded-lg border border-rule bg-ink-1 px-4 py-3">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-center">
          <div className="flex min-w-0 items-start gap-3">
            <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
              scannerHealth?.running
                ? "border-signal/30 bg-signal/10 text-signal"
                : "border-rule bg-ink-2 text-faint"
            }`}>
              <Activity className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-wide text-faint">
                Scanner health
              </div>
              <div className="mt-1 text-xl font-semibold text-body">
                {scannerStatus}
              </div>
              <div className="mt-1 text-xs text-faint">
                {scannerHealthLoading
                  ? "Loading scanner state..."
                  : `${(scannerHealth?.db?.collected_today ?? 0).toLocaleString("en-US")} collected today • ${(scannerHealth?.db?.explorer_requests_today ?? 0).toLocaleString("en-US")} explorer calls`}
              </div>
            </div>
          </div>
          <div className="grid min-w-0 gap-3 border-t border-rule pt-3 sm:grid-cols-3 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-faint">
                <Clock className="h-3.5 w-3.5" />
                Last run
              </div>
              <div className="mt-1 truncate text-sm font-medium text-body">
                {scannerHealthLoading ? "..." : formatTimestamp(scannerLastRun)}
              </div>
              <div className="mt-1 truncate text-xs text-faint">
                {scannerHealth?.cron?.enabled
                  ? `Next ${formatTimestamp(scannerNextRun)} • ${scannerCronJobs} job${scannerCronJobs === 1 ? "" : "s"}`
                  : "Cron off"}
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-faint">
                <RadioTower className="h-3.5 w-3.5" />
                RPC
              </div>
              <div className="mt-1 text-sm font-medium text-body">
                {scannerHealthLoading
                  ? "..."
                  : `${(scannerHealth?.rpc?.get_logs_requests ?? 0).toLocaleString("en-US")} calls`}
              </div>
              <div className="mt-1 truncate text-xs text-faint">
                Avg {formatDurationMs(scannerRpcAverage)} • {scannerErrors.toLocaleString("en-US")} errors
              </div>
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-wide text-faint">
                Recent networks
              </div>
              <div className="mt-1 truncate text-sm font-medium text-body">
                {scannerHealthLoading
                  ? "..."
                  : `${scannerHealth?.recent_networks?.length ?? 0} tracked`}
              </div>
              <div className="mt-1 truncate text-xs text-faint">
                {scannerRecentNetworks || "No scanner logs yet"}
              </div>
            </div>
          </div>
        </div>
      </section>
      <AddContractModal
        open={addContractModalOpen}
        onClose={() => setAddContractModalOpen(false)}
        onSuccess={runSearch}
        onSubmit={async (address, network) => {
          await addContract(address, network);
        }}
        showToast={showToast}
      />
      <section>
        {(loading || codeSearchLoading) && <LoadingSkeleton />}
        {!loading && !codeSearchLoading && (error || codeSearchError) && (
          <ErrorState message={error || codeSearchError || "An error occurred"} />
        )}
        {!loading &&
          !codeSearchLoading &&
          !error &&
          !codeSearchError &&
          codeSearchMode &&
          codeSearchResults.length === 0 && (
            <EmptyState message="No contracts match this code snippet." />
          )}
        {!loading &&
          !codeSearchLoading &&
          !error &&
          !codeSearchError &&
          !codeSearchMode &&
          !viewingBookmarks &&
          results.length === 0 &&
          hasSearched && (
            <EmptyState />
          )}
        {!loading &&
          !codeSearchLoading &&
          !error &&
          !codeSearchError &&
          viewingBookmarks &&
          bookmarks.length === 0 && (
            <EmptyState message="No bookmarks saved yet. Bookmark contracts from search results or contract detail pages." />
          )}
        {!loading &&
          !codeSearchLoading &&
          !error &&
          !codeSearchError &&
          sortedResults.length > 0 && (
          <>
            <div className="hidden sm:block">
              <ResultsTable
                contracts={sortedResults}
                nativePrices={nativePrices}
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleColumnSort}
                isBookmarked={isBookmarked}
                onBookmarkToggle={handleBookmarkToggle}
              />
            </div>
            <div className="sm:hidden">
              <div className="overflow-hidden rounded-xl border border-rule bg-ink-1">
                <ResultsCards
                  contracts={sortedResults}
                  nativePrices={nativePrices}
                  isBookmarked={isBookmarked}
                  onBookmarkToggle={handleBookmarkToggle}
                />
              </div>
            </div>
            {hasSearched && !viewingBookmarks && !codeSearchMode && (
              <Pagination
                hasPrev={cursorStack.length > 0}
                hasNext={!!nextCursor}
                onPrev={goPrev}
                onNext={goNext}
                pageIndex={cursorStack.length + 1}
                totalCount={totalCount}
                totalPages={totalPages}
                pageLimit={50}
              />
            )}
          </>
        )}
      </section>
    </Layout>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-ink-0" />}>
      <FilterProvider>
        <SearchPageContent />
      </FilterProvider>
    </Suspense>
  );
}
