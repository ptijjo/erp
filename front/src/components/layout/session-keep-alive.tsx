"use client";

import { useEffect } from "react";

import { refreshSession } from "~/lib/api";

/**
 * Intervalle de refresh proactif (ms).
 * Défaut : 70 % de JWT_ACCESS (via NEXT_PUBLIC_JWT_ACCESS_EXPIRES_SECONDS, défaut 3600).
 */
function refreshIntervalMs(): number {
  const raw = process.env.NEXT_PUBLIC_JWT_ACCESS_EXPIRES_SECONDS?.trim();
  const seconds = raw ? Number(raw) : 3600;
  const ttl = Number.isFinite(seconds) && seconds > 60 ? seconds : 3600;
  return Math.floor(ttl * 0.7 * 1000);
}

/**
 * Renouvelle la session avant expiration du JWT access
 * (le cookie est httpOnly : on ne peut pas lire `exp`, d’où un timer).
 */
export function SessionKeepAlive() {
  useEffect(() => {
    const intervalMs = refreshIntervalMs();
    let cancelled = false;

    const run = () => {
      if (cancelled || document.visibilityState === "hidden") return;
      void refreshSession().catch(() => {
        /* l’interceptor / middleware gèrent le logout */
      });
    };

    const timer = window.setInterval(run, intervalMs);

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        run();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return null;
}
