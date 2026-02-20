"use client";

import { useState } from "react";
import { X, Search, Download, ChevronDown, ChevronRight } from "lucide-react";
import { CodeSearch } from "./filters/CodeSearch";
import { AddressSearch } from "./filters/AddressSearch";
import { NameSearch } from "./filters/NameSearch";
import { TimeRangeSlider } from "./filters/TimeRangeSlider";
import { FundRangeSlider } from "./filters/FundRangeSlider";
import { NetworkFilter } from "./filters/NetworkFilter";
import { ActiveFiltersSummary } from "./filters/ActiveFiltersSummary";
import { Button } from "./ui/Button";
import { motion, AnimatePresence } from "framer-motion";

interface SidebarProps {
  onSearch: () => void;
  onExportCSV: () => void;
  onExportJSON: () => void;
  exportMenuOpen: boolean;
  onExportMenuToggle: () => void;
  hasExportData: boolean;
  onClearFilters?: () => void;
  open: boolean;
  onClose: () => void;
  codeSnippet: string;
  onCodeSnippetChange: (value: string) => void;
  onCodeSearch: () => void;
  codeSearchLoading: boolean;
}

export function Sidebar({
  onSearch,
  onExportCSV,
  onExportJSON,
  exportMenuOpen,
  onExportMenuToggle,
  hasExportData,
  onClearFilters,
  open,
  onClose,
  codeSnippet,
  onCodeSnippetChange,
  onCodeSearch,
  codeSearchLoading,
}: SidebarProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const sidebarContent = (
    <div className="space-y-5 pt-3 px-5 pb-5">
      <div className="flex items-center justify-end mb-3">
        <button
          type="button"
          onClick={onClose}
          className="lg:hidden rounded-lg p-1.5 hover:bg-bg-tertiary transition"
          aria-label="Close filters"
        >
          <X className="h-4 w-4 text-text-muted" />
        </button>
      </div>

      <CodeSearch
        codeSnippet={codeSnippet}
        onCodeSnippetChange={onCodeSnippetChange}
        onCodeSearch={onCodeSearch}
        codeSearchLoading={codeSearchLoading}
      />

      <NetworkFilter />

      <div className="pt-2">
        <Button
          variant="primary"
          className="w-full"
          onClick={onSearch}
        >
          <Search className="h-4 w-4" />
          Search Contracts
        </Button>
      </div>

      <ActiveFiltersSummary onClear={onClearFilters} />

      <div className="border-t border-border pt-1.5 mt-1">
        <button
          type="button"
          onClick={() => setAdvancedOpen((o) => !o)}
          className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-text-muted transition hover:bg-bg-tertiary hover:text-text-primary"
          aria-expanded={advancedOpen}
        >
          <span>Search & Filters</span>
          {advancedOpen ? (
            <ChevronDown className="h-4 w-4 shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0" />
          )}
        </button>
        <AnimatePresence>
          {advancedOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="space-y-5 pt-3">
                <AddressSearch />
                <NameSearch />
                <TimeRangeSlider />
                <FundRangeSlider />
                <div className="relative">
                  <Button
                    data-export-btn
                    variant="secondary"
                    className="w-full"
                    onClick={onExportMenuToggle}
                    disabled={!hasExportData}
                  >
                    <Download className="h-4 w-4" />
                    Export (CSV / JSON)
                  </Button>
                  <AnimatePresence>
                    {exportMenuOpen && (
                      <motion.div
                        data-export-menu
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-border bg-bg-secondary shadow-xl z-50 overflow-hidden"
                      >
                        <button
                          onClick={onExportCSV}
                          className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-text-primary hover:bg-bg-tertiary transition"
                        >
                          Export CSV
                        </button>
                        <button
                          onClick={onExportJSON}
                          className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-text-primary hover:bg-bg-tertiary transition"
                        >
                          Export JSON
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );

  return (
    <>
      <aside
        className={`fixed top-0 left-0 bottom-0 z-40 w-80 overflow-y-auto border-r border-border bg-bg-secondary/95 backdrop-blur-md shadow-2xl transition-transform duration-200 ease-out
          lg:sticky lg:top-[65px] lg:z-auto lg:h-[calc(100vh-65px)] lg:w-72 xl:w-80 lg:translate-x-0 lg:shadow-none lg:backdrop-blur-none
          ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
