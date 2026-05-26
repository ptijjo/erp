"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { getApiBaseUrl } from "~/lib/api";
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
    let retryMs = 1_000;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

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

    const connect = () => {
      if (disposed) return;
      es?.close();

      const url = `${getApiBaseUrl()}/realtime/events`;
      es = new EventSource(url, { withCredentials: true });

      es.addEventListener("notification", onNotificationEvent);
      es.addEventListener("message", onMessageEvent);

      es.onopen = () => {
        retryMs = 1_000;
      };

      es.onerror = () => {
        es?.close();
        es = null;
        if (disposed) return;
        retryTimer = setTimeout(() => {
          retryMs = Math.min(retryMs * 2, MAX_BACKOFF_MS);
          connect();
        }, retryMs);
      };
    };

    connect();

    return () => {
      disposed = true;
      if (retryTimer) clearTimeout(retryTimer);
      es?.removeEventListener("notification", onNotificationEvent);
      es?.removeEventListener("message", onMessageEvent);
      es?.close();
    };
  }, [enabled, queryClient]);
}
