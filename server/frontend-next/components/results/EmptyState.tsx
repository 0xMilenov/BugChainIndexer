"use client";

import { Shield } from "lucide-react";

interface EmptyStateProps {
  message?: string;
}

export function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="rounded-md border border-rule bg-ink-1 p-8 text-center">
      <div className="mb-4 text-faint">
        <Shield className="mx-auto mb-2 h-12 w-12" />
        <h3 className="text-lg font-semibold text-body">No Contracts Found</h3>
        <p className="mt-2 text-sm text-faint">
          {message ?? "Try adjusting your search filters to find more results."}
        </p>
      </div>
    </div>
  );
}
