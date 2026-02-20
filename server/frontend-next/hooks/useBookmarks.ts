"use client";

import { useCallback, useEffect, useState } from "react";
import type { Contract } from "@/types/contract";
import { getBookmarks, addBookmarkApi, removeBookmarkApi } from "@/lib/api";

const STORAGE_KEY = "bookmarks";
const MAX_BOOKMARKS = 50;

function loadFromStorage(): Contract[] {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveToStorage(items: Contract[]) {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_BOOKMARKS)));
    }
  } catch {
    // ignore
  }
}

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await getBookmarks();
        if (!cancelled && resp.ok && resp.bookmarks) {
          const items = resp.bookmarks.map((b) => ({
            address: b.address,
            network: b.network,
            contract_name: b.contract_name,
          }));
          setBookmarks(items);
          saveToStorage(items);
        }
      } catch {
        if (!cancelled) {
          const stored = loadFromStorage();
          setBookmarks(stored);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const saveBookmark = useCallback(async (contract: Contract) => {
    const normalized: Contract = {
      address: contract.address,
      network: contract.network ?? "",
      contract_name: contract.contract_name ?? contract.contractName,
    };
    setBookmarks((prev) => {
      const exists = prev.some(
        (b) =>
          b.address?.toLowerCase() === normalized.address?.toLowerCase() &&
          b.network?.toLowerCase() === normalized.network?.toLowerCase()
      );
      if (exists) return prev;
      const next = [normalized, ...prev].slice(0, MAX_BOOKMARKS);
      saveToStorage(next);
      return next;
    });
    try {
      await addBookmarkApi(normalized);
    } catch {
      // API failed - keep localStorage (already saved above), don't throw
      // Bookmark is still saved locally
      return true;
    }
    return true;
  }, []);

  const removeBookmark = useCallback(async (address: string, network: string) => {
    const addr = address;
    const net = network;
    setBookmarks((prev) => {
      const next = prev.filter(
        (b) =>
          !(
            b.address?.toLowerCase() === addr?.toLowerCase() &&
            b.network?.toLowerCase() === net?.toLowerCase()
          )
      );
      saveToStorage(next);
      return next;
    });
    try {
      await removeBookmarkApi(address, network);
    } catch {
      // API failed - keep localStorage (already removed above), don't throw
    }
  }, []);

  const isBookmarked = useCallback(
    (address: string, network: string) =>
      bookmarks.some(
        (b) =>
          b.address?.toLowerCase() === address?.toLowerCase() &&
          b.network?.toLowerCase() === network?.toLowerCase()
      ),
    [bookmarks]
  );

  return { bookmarks, saveBookmark, removeBookmark, isBookmarked, loading };
}
