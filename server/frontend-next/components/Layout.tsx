"use client";

import React from "react";
import { SlidersHorizontal } from "lucide-react";
import { SidebarProvider } from "@/context/SidebarContext";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { Footer } from "./Footer";
import { BackToTop } from "./ui/BackToTop";

interface LayoutProps {
  children: React.ReactNode;
  headerProps?: React.ComponentProps<typeof Header>;
  sidebarProps: React.ComponentProps<typeof Sidebar>;
  sidebarOpen: boolean;
  onSidebarOpenChange: (open: boolean) => void;
}

export function Layout({
  children,
  headerProps,
  sidebarProps,
  sidebarOpen,
  onSidebarOpenChange,
}: LayoutProps) {
  return (
    <SidebarProvider sidebarOpen={sidebarOpen}>
      <div className="min-h-screen bg-bg-primary text-text-primary bg-grid-overlay">
        <a href="#main-content" className="skip-link">
          Skip to results
        </a>
        <Header {...headerProps} />
      <div
        className={`fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden transition-opacity ${
          sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => onSidebarOpenChange(false)}
        aria-hidden="true"
      />
      <div className="flex min-h-[calc(100vh-4rem)]">
        <div
          className={`flex-shrink-0 overflow-hidden transition-[width] duration-200 ease-out w-0 ${
            sidebarOpen ? "lg:w-72 xl:w-80" : ""
          }`}
        >
          <Sidebar
            {...sidebarProps}
            open={sidebarOpen}
            onClose={() => onSidebarOpenChange(false)}
          />
        </div>
        {!sidebarOpen && (
          <button
            type="button"
            onClick={() => onSidebarOpenChange(true)}
            className="fixed left-0 top-[calc(4rem+1rem)] z-30 flex items-center gap-1.5 rounded-r-lg border border-l-0 border-border bg-bg-secondary px-2.5 py-2.5 text-sm text-text-muted shadow-lg transition hover:bg-bg-tertiary hover:text-text-primary"
            aria-label="Open filters"
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">Filters</span>
          </button>
        )}
        <div className="flex-1 flex flex-col min-w-0">
          <main id="main-content" className="flex-1 p-4 lg:p-6">
            {children}
          </main>
          <Footer />
        </div>
      </div>
      <BackToTop />
    </div>
    </SidebarProvider>
  );
}
