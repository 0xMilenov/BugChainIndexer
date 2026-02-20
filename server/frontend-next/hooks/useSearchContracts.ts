"use client";

import { useCallback, useState } from "react";
import { getAddressesByFilter } from "@/lib/api";
import type { Contract } from "@/types/contract";
import type { Filters } from "@/context/FilterContext";
import { FUND_UI_MAX } from "@/lib/constants";

function timeIndexToSeconds(idx: number): number {
  const map: Record<number, number> = {
    0: 3600,
    1: 21600,
    2: 86400,
    3: 604800,
    4: 1209600,
    5: 1814400,
    6: 2592000,
    7: 5184000,
    8: 7776000,
    9: 15552000,
    10: 31536000,
    11: 63072000,
    12: Infinity,
  };
  return map[idx] ?? Infinity;
}

function encodeCursor(cur: unknown): string | null {
  if (!cur) return null;
  return btoa(unescape(encodeURIComponent(JSON.stringify(cur))));
}

export interface SearchState {
  results: Contract[];
  loading: boolean;
  error: string | null;
  totalCount: number | null;
  totalPages: number | null;
  nextCursor: string | null;
  hasSearched: boolean;
  cursorStack: string[];
  currentCursor: string | null;
  pageLimit: number;
}

export interface SearchOptions {
  useExistingCursor?: boolean;
  cursor?: string | null;
  cursorStack?: string[];
}

export function useSearchContracts(
  filters: Filters,
  hideDuplicates: boolean,
  sortBy: "fund" | "first_seen" | null
) {
  const [state, setState] = useState<SearchState>({
    results: [],
    loading: false,
    error: null,
    totalCount: null,
    totalPages: null,
    nextCursor: null,
    hasSearched: false,
    cursorStack: [],
    currentCursor: null,
    pageLimit: 50,
  });

  const runSearch = useCallback(
    async (opts?: SearchOptions) => {
      const useExistingCursor = opts?.useExistingCursor ?? false;
      const cursor = opts?.cursor ?? state.currentCursor;
      const stack = opts?.cursorStack ?? state.cursorStack;

      setState((prev) => ({ ...prev, loading: true, error: null }));

      const nowSec = Math.floor(Date.now() / 1000);
      const minAgo = timeIndexToSeconds(filters.timeMin);
      const maxAgo = timeIndexToSeconds(filters.timeMax);
      const deployedTo = minAgo === 3600 ? undefined : nowSec - minAgo;
      const deployedFrom = maxAgo === Infinity ? undefined : nowSec - maxAgo;

      const fundFrom = filters.fundMin !== 0 ? filters.fundMin : undefined;
      const fundTo = filters.fundMax >= FUND_UI_MAX ? undefined : filters.fundMax;

      let effectiveCursor: string | null = null;
      let effectiveStack = stack;
      if (useExistingCursor) {
        effectiveCursor = cursor;
      } else {
        effectiveStack = [];
      }

      try {
        const enc = effectiveCursor ? encodeCursor(effectiveCursor) : undefined;
        const resp = await getAddressesByFilter({
          address: filters.address?.trim() || undefined,
          contractName: filters.name?.trim() || undefined,
          deployedFrom,
          deployedTo,
          fundFrom,
          fundTo,
          networks: filters.networks?.length ? filters.networks.join(",") : undefined,
          sortBy: sortBy ?? undefined,
          hideUnnamed: hideDuplicates ? "true" : undefined,
          limit: state.pageLimit,
          cursor: enc ?? undefined,
          includeTotal: (!useExistingCursor).toString(),
        });

        const rows = Array.isArray(resp?.data) ? resp.data : [];
        const nextCursor = resp?.nextCursor ?? null;
        const totalCount = resp?.totalCount != null ? Number(resp.totalCount) : null;
        const totalPages = resp?.totalPages != null ? Number(resp.totalPages) : null;

        setState((prev) => ({
          ...prev,
          results: rows,
          loading: false,
          error: null,
          totalCount,
          totalPages,
          nextCursor,
          hasSearched: true,
          cursorStack: effectiveStack,
          currentCursor: effectiveCursor,
        }));
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Search failed. Please try again.";
        setState((prev) => ({
          ...prev,
          loading: false,
          error: msg,
          results: [],
        }));
      }
    },
    [filters, hideDuplicates, sortBy, state.currentCursor, state.cursorStack, state.pageLimit]
  );

  const goPrev = useCallback(async () => {
    if (state.cursorStack.length === 0) return;
    const stack = [...state.cursorStack];
    const prevCursor = stack.pop() ?? null;
    await runSearch({
      useExistingCursor: true,
      cursor: prevCursor,
      cursorStack: stack,
    });
  }, [state.cursorStack, runSearch]);

  const goNext = useCallback(async () => {
    if (!state.nextCursor) return;
    const newStack = [...state.cursorStack, state.currentCursor].filter(
      (c): c is string => c != null
    );
    await runSearch({
      useExistingCursor: true,
      cursor: state.nextCursor,
      cursorStack: newStack,
    });
  }, [state.nextCursor, state.currentCursor, state.cursorStack, runSearch]);

  return { ...state, runSearch, goPrev, goNext };
}
