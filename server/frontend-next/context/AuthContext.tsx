"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { fetchMe, fetchAuthStatus, getLoginUrl, getLogoutUrl, type AuthUser } from "@/lib/auth";

interface AuthContextValue {
  user: AuthUser | null;
  authConfigured: boolean;
  isLoading: boolean;
  error: string | null;
  loginUrl: string;
  setupUrl: string;
  logoutUrl: string;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
  initialUser,
  initialAuthConfigured,
}: {
  children: React.ReactNode;
  initialUser?: AuthUser | null;
  initialAuthConfigured?: boolean;
}) {
  const [user, setUser] = useState<AuthUser | null>(initialUser ?? null);
  const [authConfigured, setAuthConfigured] = useState<boolean>(
    initialAuthConfigured ?? false
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshAuth = useCallback(async () => {
    try {
      const [u, configured] = await Promise.all([
        fetchMe(),
        fetchAuthStatus(),
      ]);
      setUser(u);
      setAuthConfigured(configured);
      setError(null);
    } catch {
      setUser(null);
      setAuthConfigured(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    (async () => {
      try {
        const [u, configured] = await Promise.all([
          fetchMe(controller.signal),
          fetchAuthStatus(controller.signal),
        ]);
        if (!cancelled) {
          setUser(u);
          setAuthConfigured(configured);
        }
        // Retry once after 500ms if no user (handles OAuth redirect cookie timing)
        if (!cancelled && !u) {
          await new Promise((r) => setTimeout(r, 500));
          const [u2, configured2] = await Promise.all([fetchMe(), fetchAuthStatus()]);
          if (!cancelled) {
            setUser(u2 ?? null);
            setAuthConfigured(configured2);
          }
        }
      } catch {
        if (!cancelled) {
          setUser(null);
          setAuthConfigured(false);
        }
      } finally {
        clearTimeout(timeout);
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  // Re-fetch when user returns to tab (e.g. after OAuth redirect)
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshAuth();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [refreshAuth]);

  return (
    <AuthContext.Provider
      value={{
        user,
        authConfigured: authConfigured ?? false,
        isLoading,
        error,
        loginUrl: getLoginUrl(),
        setupUrl: "/auth/setup",
        logoutUrl: getLogoutUrl(),
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    return {
      user: null,
      authConfigured: false,
      isLoading: false,
      error: null,
      loginUrl: getLoginUrl(),
      setupUrl: "/auth/setup",
      logoutUrl: getLogoutUrl(),
      refreshAuth: async () => {},
    };
  }
  return ctx;
}
