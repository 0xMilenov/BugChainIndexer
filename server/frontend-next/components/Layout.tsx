"use client";

import React from "react";
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
      <div className="flex min-h-[calc(100vh-65px)]">
        <Sidebar
          {...sidebarProps}
          open={sidebarOpen}
          onClose={() => onSidebarOpenChange(false)}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <main id="main-content" className="flex-1 p-4 lg:p-6">
            {children}
          </main>
          <Footer />
        </div>
      </div>
      <BackToTop />
    </div>
  );
}
