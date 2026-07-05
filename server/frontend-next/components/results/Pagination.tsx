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
          className="rounded-md bg-ink-1 px-3 py-1.5 text-sm font-medium text-body transition hover:bg-ink-2 disabled:bg-ink-1 disabled:text-faint disabled:cursor-not-allowed"
        >
          Prev
        </button>
        <button
          onClick={onNext}
          disabled={!hasNext}
          className="rounded-md bg-ink-1 px-3 py-1.5 text-sm font-medium text-body transition hover:bg-ink-2 disabled:bg-ink-1 disabled:text-faint disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
      <div className="flex-1 text-right text-sm text-faint">
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
