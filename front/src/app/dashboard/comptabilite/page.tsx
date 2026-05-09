"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  CheckCircle,
  Clock,
  Receipt,
  TrendingUp,
  XCircle,
} from "lucide-react";

import { hasMePermission, useMe } from "~/hooks/use-me";
import { api } from "~/lib/api";
import type { StockOrderDto } from "~/lib/api-types";
import { formatFcfa } from "~/lib/format-fcfa";
import { parseDecimal } from "~/lib/parse-decimal";

/** Montant de la ligne : qté × prix unitaire figé à la commande (FCFA). */
function orderEstimatedFcfa(o: StockOrderDto): number {
  return o.quantity * parseDecimal(o.unitPrice);
}

const STATUS_LABEL: Record<StockOrderDto["status"], string> = {
  PENDING: "En attente",
  CONFIRMED: "Réception confirmée",
  CANCELLED: "Annulée",
};

export default function ComptabilitePage() {
  const { data: me, isPending: mePending } = useMe();
  const canReadOrders =
    me != null && hasMePermission(me, "read", "StockOrder");

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["stock-order"] as const,
    queryFn: async () => {
      const { data } = await api.get<StockOrderDto[]>("/stock-order");
      return data;
    },
    enabled: canReadOrders,
  });

  const stats = useMemo(() => {
    let total = 0;
    const byStatus: Record<StockOrderDto["status"], number> = {
      PENDING: 0,
      CONFIRMED: 0,
      CANCELLED: 0,
    };
    const bySubsidiary = new Map<
      string,
      { id: string; name: string; amount: number }
    >();

    for (const o of orders) {
      const amt = orderEstimatedFcfa(o);
      total += amt;
      byStatus[o.status] += amt;
      const sid = o.subsidiaryOrganization.id;
      const prev = bySubsidiary.get(sid);
      if (prev) prev.amount += amt;
      else {
        bySubsidiary.set(sid, {
          id: sid,
          name: o.subsidiaryOrganization.name,
          amount: amt,
        });
      }
    }

    const topSubs = [...bySubsidiary.values()]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    return { total, byStatus, topSubs, count: orders.length };
  }, [orders]);

  const maxBar = Math.max(
    stats.byStatus.PENDING,
    stats.byStatus.CONFIRMED,
    stats.byStatus.CANCELLED,
    1,
  );

  if (mePending || !me) {
    return (
      <main className="flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-auto bg-white p-6">
        <p className="text-gray-600">Chargement…</p>
      </main>
    );
  }

  if (!canReadOrders) {
    return (
      <main className="flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-auto bg-white p-6">
        <h1 className="text-4xl font-extrabold text-orange-500">Comptabilité</h1>
        <p className="mt-4 max-w-2xl text-gray-600">
          Vous n’avez pas la permission de consulter les commandes fournisseurs.
          Lorsque vous y aurez accès, cette page affichera une synthèse des
          montants en <span className="font-semibold text-gray-800">FCFA</span>{" "}
          (prix unitaire figé × quantités).
        </p>
      </main>
    );
  }

  const statusRows: {
    status: StockOrderDto["status"];
    label: string;
    Icon: typeof Clock;
    barClass: string;
  }[] = [
    {
      status: "PENDING",
      label: STATUS_LABEL.PENDING,
      Icon: Clock,
      barClass: "bg-amber-500",
    },
    {
      status: "CONFIRMED",
      label: STATUS_LABEL.CONFIRMED,
      Icon: CheckCircle,
      barClass: "bg-emerald-500",
    },
    {
      status: "CANCELLED",
      label: STATUS_LABEL.CANCELLED,
      Icon: XCircle,
      barClass: "bg-gray-400",
    },
  ];

  return (
    <main className="flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-auto bg-white p-6">
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <h1 className="text-4xl font-extrabold text-orange-500">
            Comptabilité
          </h1>
          <p className="max-w-3xl text-sm text-gray-600">
            Synthèse des commandes fournisseurs : montants en{" "}
            <span className="font-semibold text-gray-800">FCFA</span> (quantité ×
            prix unitaire figé à la commande). Hors taxes et frais annexes.
          </p>
        </div>
      </div>

      {ordersLoading ? (
        <p className="mt-8 text-gray-600">Chargement des données…</p>
      ) : (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                <TrendingUp className="size-4 text-orange-500" />
                Volume estimé (toutes lignes)
              </div>
              <p className="mt-2 text-2xl font-bold tracking-tight text-gray-900">
                {formatFcfa(stats.total)}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {stats.count} commande{stats.count !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                <Clock className="size-4 text-amber-600" />
                {STATUS_LABEL.PENDING}
              </div>
              <p className="mt-2 text-2xl font-bold tracking-tight text-gray-900">
                {formatFcfa(stats.byStatus.PENDING)}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                <CheckCircle className="size-4 text-emerald-600" />
                {STATUS_LABEL.CONFIRMED}
              </div>
              <p className="mt-2 text-2xl font-bold tracking-tight text-gray-900">
                {formatFcfa(stats.byStatus.CONFIRMED)}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                <XCircle className="size-4 text-gray-500" />
                {STATUS_LABEL.CANCELLED}
              </div>
              <p className="mt-2 text-2xl font-bold tracking-tight text-gray-900">
                {formatFcfa(stats.byStatus.CANCELLED)}
              </p>
            </div>
          </div>

          <section className="mt-10">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <BarChart3 className="size-5 text-orange-500" />
              Répartition par statut (FCFA)
            </h2>
            <div className="mt-4 space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              {statusRows.map(({ status, label, Icon, barClass }) => {
                const amount = stats.byStatus[status];
                const pct = (amount / maxBar) * 100;
                return (
                  <div key={status}>
                    <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                      <span className="flex items-center gap-1.5 font-medium text-gray-700">
                        <Icon className="size-4 shrink-0 opacity-80" />
                        {label}
                      </span>
                      <span className="shrink-0 font-mono text-xs text-gray-600 sm:text-sm">
                        {formatFcfa(amount)}
                      </span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={`h-full rounded-full transition-all ${barClass}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {stats.topSubs.length > 0 ? (
            <section className="mt-10">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                <Receipt className="size-5 text-orange-500" />
                Montants cumulés par filiale (FCFA)
              </h2>
              <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-gray-200 bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-gray-700">
                        Organisation
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">
                        Montant estimé
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.topSubs.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b border-gray-100 last:border-0"
                      >
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {row.name}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-gray-800">
                          {formatFcfa(row.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
        </>
      )}
    </main>
  );
}
