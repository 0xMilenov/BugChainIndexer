"use client";

import { createContext, useContext } from "react";

interface SidebarContextValue {
  sidebarOpen: boolean;
}

const SidebarContext = createContext<SidebarContextValue>({ sidebarOpen: true });

export function SidebarProvider({
  children,
  sidebarOpen,
}: {
  children: React.ReactNode;
  sidebarOpen: boolean;
}) {
  return (
    <SidebarContext.Provider value={{ sidebarOpen }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  return useContext(SidebarContext);
}
