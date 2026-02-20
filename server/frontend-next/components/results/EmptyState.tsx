"use client";

import { Shield } from "lucide-react";

interface EmptyStateProps {
  message?: string;
}

export function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="rounded-xl border border-border bg-bg-secondary p-8 text-center">
      <div className="mb-4 text-text-muted">
        <Shield className="mx-auto mb-2 h-12 w-12" />
        <h3 className="text-lg font-semibold text-text-primary">No Contracts Found</h3>
        <p className="mt-2 text-sm text-text-muted">
          {message ?? "Try adjusting your search filters to find more results."}
        </p>
      </div>
    </div>
  );
}
