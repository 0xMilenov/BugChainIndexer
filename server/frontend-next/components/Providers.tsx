"use client";

import { ToastProvider } from "@/context/ToastContext";
import { AuthProvider } from "@/context/AuthContext";
import type { AuthUser } from "@/lib/auth";

interface ProvidersProps {
  children: React.ReactNode;
  initialUser?: AuthUser | null;
  initialAuthConfigured?: boolean;
}

export function Providers({
  children,
  initialUser,
  initialAuthConfigured,
}: ProvidersProps) {
  return (
    <AuthProvider
      initialUser={initialUser}
      initialAuthConfigured={initialAuthConfigured}
    >
      <ToastProvider>{children}</ToastProvider>
    </AuthProvider>
  );
}
