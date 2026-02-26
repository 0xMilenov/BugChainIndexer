"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { searchByCode, addContract } from "@/lib/api";
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
} from "@/lib/contract-utils";
import { Info } from "lucide-react";
import { AddContractModal } from "@/components/AddContractModal";
import { Button } from "@/components/ui/Button";
import { FUND_UI_MAX } from "@/lib/constants";
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

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const showToast = useShowToast();
  const { refreshAuth } = useAuth();

  useEffect(() => {
    const authError = searchParams.get("auth_error");
    if (authError) {
      router.replace(`/auth/error?message=${encodeURIComponent(authError)}`);
    }
  }, [searchParams, router]);

  // After OAuth success, we land with ?from=oauth; refresh auth and clear the URL
  useEffect(() => {
    if (searchParams.get("from") === "oauth") {
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

  const [sortBy, setSortBy] = useState<"fund" | "first_seen" | null>("fund");
  const [sortColumn, setSortColumn] = useState("fund");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [hideDuplicates, setHideDuplicates] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [viewingBookmarks, setViewingBookmarks] = useState(false);
  const [codeSnippet, setCodeSnippet] = useState("");
  const [codeSearchResults, setCodeSearchResults] = useState<typeof results>([]);
  const [codeSearchMode, setCodeSearchMode] = useState(false);
  const [codeSearchLoading, setCodeSearchLoading] = useState(false);
  const [codeSearchError, setCodeSearchError] = useState<string | null>(null);
  const [addContractModalOpen, setAddContractModalOpen] = useState(false);

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
    [isBookmarked, removeBookmark, saveBookmark, showToast]
  );

  const handleShowBookmarks = useCallback(() => {
    if (bookmarks.length === 0) {
      showToast("No bookmarks saved yet.", "info");
      return;
    }
    setViewingBookmarks(true);
  }, [bookmarks.length, showToast]);

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
      "EVMBENCH",
      "GETRECON",
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
      r.evmbench ? "true" : "false",
      r.getrecon ? "true" : "false",
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
          <span className="text-sm text-text-muted">{resultsMeta}</span>
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
              className="inline-flex text-text-muted hover:text-text-primary transition cursor-default"
              aria-label="Don't see the contract you need? Add it manually."
            >
              <Info className="h-4 w-4" />
            </span>
            <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden whitespace-nowrap rounded bg-bg-tertiary px-2.5 py-1.5 text-xs text-text-primary shadow-lg border border-border group-hover:block z-50">
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
              <div className="overflow-hidden rounded-xl border border-border bg-bg-secondary">
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
    <Suspense fallback={<div className="min-h-screen bg-bg-primary" />}>
      <FilterProvider>
        <SearchPageContent />
      </FilterProvider>
    </Suspense>
  );
}
