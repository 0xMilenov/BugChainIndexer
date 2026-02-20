"use client";

import React from "react";

export function Footer() {
  return (
    <footer className="border-t border-border bg-bg-secondary">
      <div className="mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-center py-4">
          <p className="text-xs text-text-muted">
            &copy; {new Date().getFullYear()} VISUALISA
          </p>
        </div>
      </div>
    </footer>
  );
}
