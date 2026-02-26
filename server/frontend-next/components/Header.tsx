"use client";

import Image from "next/image";
import Link from "next/link";
import { SlidersHorizontal, Bookmark, LogIn } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { AuthStatus } from "./AuthStatus";

const getLoginHref = () => "/auth/github";

interface HeaderProps {
  onToggleFilters?: () => void;
  sidebarOpen?: boolean;
  filterBadgeCount?: number;
  onShowBookmarks?: () => void;
  bookmarkCount?: number;
}

export function Header({ onToggleFilters, sidebarOpen, filterBadgeCount, onShowBookmarks, bookmarkCount = 0 }: HeaderProps) {
  const { user, authConfigured } = useAuth();
  const loginHref = getLoginHref();
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg-primary/95 backdrop-blur-md shadow-cyan-500/5">
      <div className="mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between py-3">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="relative h-10 w-10 flex-shrink-0 rounded-full overflow-hidden group/logo">
              <div
                className="h-full w-full rounded-full overflow-hidden"
                style={{ opacity: 0.82 }}
              >
                <Image
                  src="/logo-black2.png"
                  alt="VISUALISA"
                  fill
                  className="object-contain"
                  sizes="40px"
                  priority
                />
              </div>
              <div
                className="absolute inset-0 rounded-full bg-[#a1a1aa]/50 opacity-0 transition-opacity duration-200 group-hover/logo:opacity-100 pointer-events-none"
                aria-hidden
              />
            </div>
            <h1
              className="text-xl font-bold transition-colors group-hover:opacity-90"
              style={{ color: "#a1a1aa" }}
            >
              VISUALISA
            </h1>
          </Link>
          <div className="flex items-center gap-2 flex-nowrap shrink-0">
            {user ? (
              <AuthStatus />
            ) : (
              <Link
                href={loginHref}
                className="flex items-center gap-1 px-3 py-1 rounded-md transition relative bg-bg-secondary text-text-muted hover:bg-bg-tertiary hover:text-accent flex-shrink-0"
                aria-label={authConfigured ? "Log in with GitHub" : "Setup GitHub OAuth"}
              >
                <LogIn className="h-4 w-4" />
                <span>Log in</span>
              </Link>
            )}
            {onShowBookmarks && (
              <button
                onClick={onShowBookmarks}
                className="flex items-center gap-1 px-3 py-1 rounded-md transition relative bg-bg-secondary text-text-muted hover:bg-bg-tertiary hover:text-accent flex-shrink-0"
                aria-label="Show bookmarks"
              >
                <Bookmark className="h-4 w-4" />
                <span className="hidden sm:inline">Bookmarks</span>
                {bookmarkCount > 0 && (
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-accent/20 text-accent px-1.5 text-xs font-medium">
                    {bookmarkCount}
                  </span>
                )}
              </button>
            )}
            {onToggleFilters && (
              <button
                onClick={onToggleFilters}
                className="lg:hidden flex items-center gap-1 px-3 py-1 rounded-md transition relative bg-bg-secondary text-text-muted hover:bg-bg-tertiary"
                aria-label="Toggle filters"
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span>Filters</span>
                {filterBadgeCount && filterBadgeCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold">
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
