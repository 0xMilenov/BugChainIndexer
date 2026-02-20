"use client";

import React, { createContext, useContext } from "react";
import { useToast } from "@/hooks/useToast";
import { Toast } from "@/components/ui/Toast";

type ShowToast = (message: string, type?: "info" | "success" | "error") => void;

const ToastContext = createContext<ShowToast | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { toasts, showToast } = useToast();
  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <Toast toasts={toasts} />
    </ToastContext.Provider>
  );
}

export function useShowToast() {
  const ctx = useContext(ToastContext);
  return ctx ?? (() => {});
}
