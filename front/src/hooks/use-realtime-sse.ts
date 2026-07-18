"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { api, getApiBaseUrl } from "~/lib/api";
import {
  parseRealtimeMessage,
  parseRealtimeNotification,
  type RealtimeMessagePayload,
  type RealtimeNotificationPayload,
} from "~/lib/realtime-payloads";

type RealtimeHandlers = {
  onNotification?: (payload: RealtimeNotificationPayload) => void;
  onMessage?: (payload: RealtimeMessagePayload) => void;
};

const MAX_BACKOFF_MS = 30_000;
const INITIAL_BACKOFF_MS = 1_000;

async function refreshSessionQuietly(): Promise<boolean> {
  try {
    await api.post("/auth/refresh", null, { skipAuthRefresh: true });
    return true;
  } catch {
    return false;
  }
}

/**
 * Connexion SSE temps réel.
 * Sur erreur (JWT expiré, redémarrage API) : refresh cookie puis reconnexion.
 */
export function useRealtimeSse(
  enabled: boolean,
  handlers: RealtimeHandlers,
): void {
  const queryClient = useQueryClient();
  const handlersRef = useRef(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    if (!enabled) return;

    let es: EventSource | null = null;
    let disposed = false;
    let retryMs = INITIAL_BACKOFF_MS;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let connecting = false;

    const invalidateNotificationQueries = () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    };

    const invalidateMessagingQueries = () => {
      void queryClient.invalidateQueries({ queryKey: ["messaging"] });
    };

    const onNotificationEvent = (event: Event) => {
      const raw = (event as MessageEvent<string>).data;
      if (typeof raw !== "string") return;
      const payload = parseRealtimeNotification(raw);
      if (!payload) return;
      invalidateNotificationQueries();
      handlersRef.current.onNotification?.(payload);
    };

    const onMessageEvent = (event: Event) => {
      const raw = (event as MessageEvent<string>).data;
      if (typeof raw !== "string") return;
      const payload = parseRealtimeMessage(raw);
      if (!payload) return;
      invalidateMessagingQueries();
      handlersRef.current.onMessage?.(payload);
    };

    const scheduleReconnect = () => {
      if (disposed) return;
      if (retryTimer) clearTimeout(retryTimer);
      retryTimer = setTimeout(() => {
        void connect();
      }, retryMs);
      retryMs = Math.min(retryMs * 2, MAX_BACKOFF_MS);
    };

    const connect = async () => {
      if (disposed || connecting) return;
      connecting = true;

      try {
        es?.close();
        es = null;

        // EventSource ne peut pas rafraîchir le JWT : on le fait avant chaque tentative.
        await refreshSessionQuietly();
        if (disposed) return;

        const url = `${getApiBaseUrl()}/realtime/events`;
        es = new EventSource(url, { withCredentials: true });

        es.addEventListener("notification", onNotificationEvent);
        es.addEventListener("message", onMessageEvent);
        // `ping` ignoré volontairement (garde la connexion ouverte).

        es.onopen = () => {
          retryMs = INITIAL_BACKOFF_MS;
        };

        es.onerror = () => {
          es?.removeEventListener("notification", onNotificationEvent);
          es?.removeEventListener("message", onMessageEvent);
          es?.close();
          es = null;
          if (disposed) return;
          scheduleReconnect();
        };
      } finally {
        connecting = false;
      }
    };

    void connect();

    const onVisibility = () => {
      if (document.visibilityState !== "visible" || disposed) return;
      // Onglet de retour : forcer une reconnexion fraîche.
      retryMs = INITIAL_BACKOFF_MS;
      es?.close();
      es = null;
      void connect();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", onVisibility);
      if (retryTimer) clearTimeout(retryTimer);
      es?.removeEventListener("notification", onNotificationEvent);
      es?.removeEventListener("message", onMessageEvent);
      es?.close();
    };
  }, [enabled, queryClient]);
}
