"use client";

import Image from "next/image";
import Link from "next/link";
import { SlidersHorizontal, Bookmark, LogIn } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { AuthStatus } from "./AuthStatus";

interface HeaderProps {
  onToggleFilters?: () => void;
  sidebarOpen?: boolean;
  filterBadgeCount?: number;
  onShowBookmarks?: () => void;
  bookmarkCount?: number;
}

export function Header({ onToggleFilters, sidebarOpen, filterBadgeCount, onShowBookmarks, bookmarkCount = 0 }: HeaderProps) {
  const { user, loginUrl } = useAuth();
  return (
    <header className="sticky top-0 z-30 h-16 flex flex-col justify-center border-b border-rule bg-ink-0/95 backdrop-blur-md">
      <div className="mx-auto w-full px-4 sm:px-6">
        <div className="flex items-center justify-between">
          <Link href="/" aria-label="AAA home" className="inline-flex items-center rounded-[4px] transition-opacity hover:opacity-80">
            <Image src="/brand/aaa-mark.png" alt="" width={40} height={40} className="rounded-[4px]" priority aria-hidden />
          </Link>
          <div className="flex items-center gap-2 flex-nowrap shrink-0">
            {user ? (
              <AuthStatus />
            ) : (
              <Link
                href={loginUrl}
                className="flex items-center gap-1 px-3 py-1 rounded-md transition relative bg-ink-1 text-faint hover:bg-ink-2 hover:text-brand-text flex-shrink-0"
                aria-label="Log in"
              >
                <LogIn className="h-4 w-4" />
                <span>Log in</span>
              </Link>
            )}
            {onShowBookmarks && (
              <button
                onClick={onShowBookmarks}
                className="flex items-center gap-1 px-3 py-1 rounded-md transition relative bg-ink-1 text-faint hover:bg-ink-2 hover:text-brand-text flex-shrink-0"
                aria-label="Show bookmarks"
              >
                <Bookmark className="h-4 w-4" />
                <span className="hidden sm:inline">Bookmarks</span>
                {bookmarkCount > 0 && (
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand-600/20 text-brand-text px-1.5 text-xs font-medium">
                    {bookmarkCount}
                  </span>
                )}
              </button>
            )}
            {onToggleFilters && (
              <button
                onClick={onToggleFilters}
                className="flex items-center gap-1 px-3 py-1 rounded-md transition relative bg-ink-1 text-faint hover:bg-ink-2"
                aria-label={sidebarOpen ? "Close filters" : "Open filters"}
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span>Filters</span>
                {filterBadgeCount && filterBadgeCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-sev-crit text-white text-xs font-bold">
                    {filterBadgeCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
