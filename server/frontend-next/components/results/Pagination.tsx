"use client";

interface PaginationProps {
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  pageIndex: number;
  totalCount: number | null;
  totalPages: number | null;
  pageLimit: number;
}

export function Pagination({
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  pageIndex,
  totalCount,
  totalPages,
  pageLimit,
}: PaginationProps) {
  return (
    <div className="mt-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <button
          onClick={onPrev}
          disabled={!hasPrev}
          className="rounded-lg bg-bg-secondary px-3 py-1.5 text-sm font-medium text-text-primary transition hover:bg-bg-tertiary disabled:bg-bg-secondary disabled:text-text-muted disabled:cursor-not-allowed"
        >
          Prev
        </button>
        <button
          onClick={onNext}
          disabled={!hasNext}
          className="rounded-lg bg-bg-secondary px-3 py-1.5 text-sm font-medium text-text-primary transition hover:bg-bg-tertiary disabled:bg-bg-secondary disabled:text-text-muted disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
      <div className="flex-1 text-right text-sm text-text-muted">
        <span className="whitespace-nowrap">
          Page size: {pageLimit}
          {pageIndex === 1 ? " (first page)" : ""}
        </span>
        {totalCount != null && (
          <span className="ml-2 whitespace-nowrap">
            • Total: {totalCount}
            {totalPages != null ? ` • Pages: ${totalPages}` : ""}
          </span>
        )}
      </div>
    </div>
  );
}
