"use client";

import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { LogIn, LogOut } from "lucide-react";

export function AuthStatus() {
  const { user, loginUrl, logoutUrl } = useAuth();

  // Always show Log in when not authenticated (don't wait for auth check - it may hang)
  if (!user) {
    return (
      <a
        href={loginUrl}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-bg-secondary text-text-primary hover:bg-bg-tertiary hover:text-accent hover:border-accent/40 transition flex-shrink-0 font-medium"
        aria-label="Log in with GitHub"
      >
        <LogIn className="h-4 w-4 flex-shrink-0" />
        <span>Log in</span>
      </a>
    );
  }

  const avatar = user.avatar_url ? (
    <Image
      src={user.avatar_url}
      alt={`${user.username} avatar`}
      width={24}
      height={24}
      className="size-6 rounded-full object-cover"
      referrerPolicy="no-referrer"
      unoptimized
    />
  ) : (
    <div className="flex size-6 items-center justify-center rounded-full bg-bg-tertiary text-text-muted text-xs font-medium uppercase">
      {user.username.slice(0, 1)}
    </div>
  );

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5">
        {avatar}
        <span className="hidden max-w-24 truncate sm:inline text-sm">{user.username}</span>
      </div>
      <a
        href={logoutUrl}
        className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-text-muted hover:bg-bg-tertiary hover:text-accent transition"
        title="Log out"
      >
        <LogOut className="h-4 w-4" />
        <span className="hidden sm:inline">Log out</span>
      </a>
    </div>
  );
}
