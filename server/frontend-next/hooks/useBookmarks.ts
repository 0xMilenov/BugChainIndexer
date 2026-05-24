"use client";

import { useCallback, useEffect, useState } from "react";
import type { Contract } from "@/types/contract";
import { getBookmarks, addBookmarkApi, removeBookmarkApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const MAX_BOOKMARKS = 50;

export function useBookmarks() {
  const { user } = useAuth();
  const [bookmarks, setBookmarks] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setBookmarks([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
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
        }
      } catch {
        if (!cancelled) setBookmarks([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const saveBookmark = useCallback(async (contract: Contract) => {
    if (!user) throw new Error("Login required");
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
      return next;
    });
    await addBookmarkApi(normalized);
    return true;
  }, [user]);

  const removeBookmark = useCallback(async (address: string, network: string) => {
    if (!user) throw new Error("Login required");
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
      return next;
    });
    await removeBookmarkApi(address, network);
  }, [user]);

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
