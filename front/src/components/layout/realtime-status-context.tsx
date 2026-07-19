"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type RealtimeStatusContextValue = {
  /** true quand EventSource est ouvert (SSE). */
  sseConnected: boolean;
  setSseConnected: (connected: boolean) => void;
};

const RealtimeStatusContext =
  createContext<RealtimeStatusContextValue | null>(null);

export function RealtimeStatusProvider({ children }: { children: ReactNode }) {
  const [sseConnected, setSseConnectedState] = useState(false);
  const setSseConnected = useCallback((connected: boolean) => {
    setSseConnectedState(connected);
  }, []);

  const value = useMemo(
    () => ({ sseConnected, setSseConnected }),
    [sseConnected, setSseConnected],
  );

  return (
    <RealtimeStatusContext.Provider value={value}>
      {children}
    </RealtimeStatusContext.Provider>
  );
}

export function useRealtimeStatus(): RealtimeStatusContextValue {
  const ctx = useContext(RealtimeStatusContext);
  if (!ctx) {
    throw new Error(
      "useRealtimeStatus doit être utilisé dans RealtimeStatusProvider",
    );
  }
  return ctx;
}

/** Variante tolérante : hors provider → SSE considéré déconnecté (polling OK). */
export function useRealtimeSseConnected(): boolean {
  const ctx = useContext(RealtimeStatusContext);
  return ctx?.sseConnected ?? false;
}
