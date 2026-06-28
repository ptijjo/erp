"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Info } from "lucide-react";

import { api } from "~/lib/api";

export type DashboardAlertDto = {
  code: string;
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  href?: string;
  count?: number;
};

export function DashboardAlertBanner() {
  const { data: alerts } = useQuery({
    queryKey: ["alerts", "dashboard"] as const,
    queryFn: async () => {
      const { data } = await api.get<DashboardAlertDto[]>("/alerts/dashboard");
      return data;
    },
    staleTime: 60_000,
  });

  if (!alerts?.length) return null;

  return (
    <div className="space-y-2">
      {alerts.map((alert) => {
        const Icon = alert.severity === "info" ? Info : AlertTriangle;
        const tone =
          alert.severity === "critical"
            ? "border-destructive/40 bg-destructive/5 text-destructive"
            : alert.severity === "warning"
              ? "border-amber-300 bg-amber-50 text-amber-950"
              : "border-primary/20 bg-primary/5 text-foreground";

        const content = (
          <div
            className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${tone}`}
          >
            <Icon className="mt-0.5 size-4 shrink-0" />
            <div>
              <p className="font-medium">{alert.title}</p>
              <p className="mt-0.5 opacity-90">{alert.message}</p>
            </div>
          </div>
        );

        return alert.href ? (
          <Link key={alert.code} href={alert.href} className="block hover:opacity-95">
            {content}
          </Link>
        ) : (
          <div key={alert.code}>{content}</div>
        );
      })}
    </div>
  );
}
