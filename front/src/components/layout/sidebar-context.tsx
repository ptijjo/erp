"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

const SIDEBAR_STORAGE_KEY = "vifaa.sidebar.v1";
const sidebarListeners = new Set<() => void>();

function readCollapsed(): boolean {
  return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) !== "expanded";
}

function subscribeSidebar(listener: () => void): () => void {
  sidebarListeners.add(listener);
  return () => {
    sidebarListeners.delete(listener);
  };
}

function writeCollapsed(collapsed: boolean): void {
  window.localStorage.setItem(
    SIDEBAR_STORAGE_KEY,
    collapsed ? "rail" : "expanded",
  );
  for (const listener of sidebarListeners) listener();
}

type SidebarContextValue = {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  toggleMobile: () => void;
  /** Rail d’icônes sur grand écran. */
  collapsed: boolean;
  toggleCollapsed: () => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const collapsed = useSyncExternalStore(
    subscribeSidebar,
    readCollapsed,
    () => true,
  );
  const toggleMobile = useCallback(() => {
    setMobileOpen((open) => !open);
  }, []);
  const toggleCollapsed = useCallback(() => {
    writeCollapsed(!readCollapsed());
  }, []);

  const value = useMemo(
    () => ({
      mobileOpen,
      setMobileOpen,
      toggleMobile,
      collapsed,
      toggleCollapsed,
    }),
    [mobileOpen, toggleMobile, collapsed, toggleCollapsed],
  );

  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  );
}

export function useSidebar(): SidebarContextValue {
  const ctx = useContext(SidebarContext);
  if (!ctx) {
    throw new Error("useSidebar doit être utilisé dans SidebarProvider");
  }
  return ctx;
}
