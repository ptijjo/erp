"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BarChart3,
  CheckCircle,
  Clock,
  PieChart as PieChartIcon,
  Receipt,
  TrendingUp,
  XCircle,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { PageHeader } from "~/components/layout/page-header";
import { PageShell } from "~/components/layout/page-shell";
import { hasMePermission, isMainOrganization, useMe } from "~/hooks/use-me";
import { api } from "~/lib/api";
import type { OrganizationDto, StockOrderDto } from "~/lib/api-types";
import { formatFcfa } from "~/lib/format-fcfa";
import { parseDecimal } from "~/lib/parse-decimal";

import { StockOrderBudgetBadge } from "~/app/dashboard/stocks/_components/StockOrderBudgetBadge";

import { OrderSummaryStatCard } from "./_components/OrderSummaryStatCard";

const ALL_SUBSIDIARIES = "all";

function formatFcfaAxis(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)} Md`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)} k`;
  return `${n}`;
}

function orderEstimatedFcfa(o: StockOrderDto): number {
  return o.quantity * parseDecimal(o.unitPrice);
}

const STATUS_LABEL: Record<StockOrderDto["status"], string> = {
  PENDING: "En attente",
  CONFIRMED: "Réception confirmée",
  CANCELLED: "Annulée",
};

const STATUS_CHART_STYLES: Record<
  StockOrderDto["status"],
  { fill: string; Icon: typeof Clock }
> = {
  PENDING: { fill: "#f59e0b", Icon: Clock },
  CONFIRMED: { fill: "#10b981", Icon: CheckCircle },
  CANCELLED: { fill: "#9ca3af", Icon: XCircle },
};

function SummaryDescription({
  isHq,
  selectedSubsidiaryLabel,
  subsidiaryFilterId,
}: {
  isHq: boolean;
  selectedSubsidiaryLabel: string | null;
  subsidiaryFilterId: string;
}) {
  return (
    <div className="min-w-0 flex-1 space-y-1">
      <p className="max-w-3xl text-sm text-muted-foreground">
        Montants estimés des commandes fournisseurs en{" "}
        <span className="font-medium text-foreground">FCFA</span> (quantité × prix
        unitaire figé à la commande). Pour les budgets et sorties (loyer,
        salaires…), voir{" "}
        <Link
          href="/dashboard/budgets"
          className="font-medium text-primary underline-offset-2 hover:underline"
        >
          Budgets
        </Link>
        .
      </p>
      {isHq && selectedSubsidiaryLabel ? (
        <p className="text-sm font-medium text-orange-800">
          Périmètre : {selectedSubsidiaryLabel}
        </p>
      ) : null}
      {isHq && subsidiaryFilterId === "" ? (
        <p className="text-xs text-muted-foreground">
          Toutes les filiales sont incluses — filtrez pour zoomer sur une filiale.
        </p>
      ) : null}
    </div>
  );
}

function SubsidiaryFilter({
  subsidiaryFilterId,
  subsidiaryOptions,
  onChange,
}: {
  subsidiaryFilterId: string;
  subsidiaryOptions: OrganizationDto[];
  onChange: (id: string) => void;
}) {
  const selectValue =
    subsidiaryFilterId === "" ? ALL_SUBSIDIARIES : subsidiaryFilterId;

  return (
    <div className="flex w-full shrink-0 flex-col gap-2 sm:w-72">
      <Label htmlFor="compta-subsidiary-filter">Filiale</Label>
      <Select
        value={selectValue}
        onValueChange={(v) => onChange(v === ALL_SUBSIDIARIES ? "" : v)}
      >
        <SelectTrigger id="compta-subsidiary-filter" className="w-full">
          <SelectValue placeholder="Toutes les filiales" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_SUBSIDIARIES}>Toutes les filiales</SelectItem>
          {subsidiaryOptions.map((o) => (
            <SelectItem key={o.id} value={o.id}>
              {o.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default function ComptabilitePage() {
  const { data: me, isPending: mePending } = useMe();
  const canReadOrders =
    me != null && hasMePermission(me, "read", "StockOrder");
  const isHq = me != null && isMainOrganization(me);
  const [subsidiaryFilterId, setSubsidiaryFilterId] = useState("");

  const { data: organisations = [] } = useQuery({
    queryKey: ["organisation"] as const,
    queryFn: async () => {
      const { data } = await api.get<OrganizationDto[]>("/organisation");
      return data;
    },
    enabled: canReadOrders && isHq,
  });

  const subsidiaryOptions = useMemo(
    () =>
      [...organisations]
        .filter((o) => o.organizationType === "SUBSIDIARY")
        .sort((a, b) => a.name.localeCompare(b.name, "fr")),
    [organisations],
  );

  const selectedSubsidiaryLabel = useMemo(() => {
    if (subsidiaryFilterId === "") return null;
    return (
      subsidiaryOptions.find((o) => o.id === subsidiaryFilterId)?.name ?? null
    );
  }, [subsidiaryFilterId, subsidiaryOptions]);

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["stock-order", subsidiaryFilterId, isHq ? "hq" : "sub"] as const,
    queryFn: async () => {
      const config =
        isHq && subsidiaryFilterId !== ""
          ? { params: { subsidiaryOrganizationId: subsidiaryFilterId } }
          : {};
      const { data } = await api.get<StockOrderDto[]>("/stock-order", config);
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

  const statusBarData = useMemo(
    () =>
      (["PENDING", "CONFIRMED", "CANCELLED"] as const).map((status) => ({
        status,
        name: STATUS_LABEL[status],
        value: stats.byStatus[status],
        fill: STATUS_CHART_STYLES[status].fill,
      })),
    [stats.byStatus],
  );

  const statusPieData = useMemo(
    () =>
      statusBarData
        .filter((d) => d.value > 0)
        .map((d) => ({ name: d.name, value: d.value, fill: d.fill })),
    [statusBarData],
  );

  const subsidiaryBarData = useMemo(
    () => stats.topSubs.map((s) => ({ name: s.name, montant: s.amount })),
    [stats.topSubs],
  );

  const subsidiaryChartHeight = Math.max(200, subsidiaryBarData.length * 32);

  const volumeTitle =
    isHq && subsidiaryFilterId === ""
      ? "Volume estimé (toutes filiales)"
      : isHq && selectedSubsidiaryLabel
        ? `Volume estimé — ${selectedSubsidiaryLabel}`
        : "Volume estimé";

  if (mePending || !me) {
    return (
      <PageShell>
        <p className="text-sm text-muted-foreground">Chargement…</p>
      </PageShell>
    );
  }

  if (!canReadOrders) {
    return (
      <PageShell>
        <PageHeader title="Synthèse commandes" />
        <p className="mt-6 max-w-2xl text-sm text-muted-foreground">
          Vous n’avez pas la permission de consulter les commandes fournisseurs.
        </p>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Synthèse commandes"
        description={
          <SummaryDescription
            isHq={isHq}
            selectedSubsidiaryLabel={selectedSubsidiaryLabel}
            subsidiaryFilterId={subsidiaryFilterId}
          />
        }
        actions={
          isHq ? (
            <SubsidiaryFilter
              subsidiaryFilterId={subsidiaryFilterId}
              subsidiaryOptions={subsidiaryOptions}
              onChange={setSubsidiaryFilterId}
            />
          ) : undefined
        }
      />

      {ordersLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">
          Chargement des données…
        </p>
      ) : stats.count === 0 ? (
        <Card className="mt-6 border-dashed py-8 shadow-sm">
          <CardHeader className="px-4">
            <CardTitle className="text-base">
              Aucune commande sur ce périmètre
            </CardTitle>
            <CardDescription>
              Les montants apparaîtront dès qu’il existera des commandes
              fournisseurs enregistrées. Hors taxes et frais annexes.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <OrderSummaryStatCard
              title={volumeTitle}
              value={formatFcfa(stats.total)}
              hint={`${stats.count} commande${stats.count !== 1 ? "s" : ""}`}
              icon={TrendingUp}
              iconClassName="text-primary"
            />
            <OrderSummaryStatCard
              title={STATUS_LABEL.PENDING}
              value={formatFcfa(stats.byStatus.PENDING)}
              icon={Clock}
              iconClassName="text-amber-600"
            />
            <OrderSummaryStatCard
              title={STATUS_LABEL.CONFIRMED}
              value={formatFcfa(stats.byStatus.CONFIRMED)}
              icon={CheckCircle}
              iconClassName="text-emerald-600"
            />
            <OrderSummaryStatCard
              title={STATUS_LABEL.CANCELLED}
              value={formatFcfa(stats.byStatus.CANCELLED)}
              icon={XCircle}
              iconClassName="text-gray-500"
            />
          </div>

          <section className="mt-8">
            <Card className="gap-0 py-4 shadow-sm">
              <CardHeader className="px-4 pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="size-5 text-primary" />
                  Répartition par statut (FCFA)
                </CardTitle>
              </CardHeader>
              <CardContent className="px-2 pb-4 sm:px-4">
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={statusBarData}
                      margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="stroke-gray-200"
                      />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11 }}
                        interval={0}
                        angle={-12}
                        textAnchor="end"
                        height={64}
                      />
                      <YAxis
                        tickFormatter={formatFcfaAxis}
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip
                        formatter={(value) =>
                          formatFcfa(
                            typeof value === "number" ? value : Number(value),
                          )
                        }
                        contentStyle={{ borderRadius: 8 }}
                      />
                      <Bar dataKey="value" name="Montant" radius={[4, 4, 0, 0]}>
                        {statusBarData.map((row) => (
                          <Cell key={row.status} fill={row.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </section>

          {statusPieData.length > 0 ? (
            <section className="mt-6">
              <Card className="gap-0 py-4 shadow-sm">
                <CardHeader className="px-4 pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <PieChartIcon className="size-5 text-primary" />
                    Part des montants par statut
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-2 pb-4 sm:px-4">
                  <div className="h-[260px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusPieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          label={({ name, percent }) =>
                            `${name ?? ""} (${((percent ?? 0) * 100).toFixed(0)} %)`
                          }
                        >
                          {statusPieData.map((d) => (
                            <Cell key={d.name} fill={d.fill} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) =>
                            formatFcfa(
                              typeof value === "number" ? value : Number(value),
                            )
                          }
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </section>
          ) : null}

          {subsidiaryBarData.length > 0 ? (
            <section className="mt-6">
              <Card className="gap-0 py-4 shadow-sm">
                <CardHeader className="px-4 pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Receipt className="size-5 text-primary" />
                    Montants cumulés par filiale (FCFA)
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-2 pb-4 sm:px-4">
                  <div
                    className="w-full"
                    style={{ height: subsidiaryChartHeight }}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        layout="vertical"
                        data={subsidiaryBarData}
                        margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          className="stroke-gray-200"
                        />
                        <XAxis
                          type="number"
                          tickFormatter={formatFcfaAxis}
                          tick={{ fontSize: 11 }}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={140}
                          tick={{ fontSize: 11 }}
                        />
                        <Tooltip
                          formatter={(value) =>
                            formatFcfa(
                              typeof value === "number" ? value : Number(value),
                            )
                          }
                        />
                        <Bar
                          dataKey="montant"
                          name="Montant estimé"
                          fill="hsl(var(--primary))"
                          radius={[0, 4, 4, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 overflow-x-auto lg:hidden">
                    <table className="min-w-full text-left text-sm">
                      <thead className="border-b bg-muted/50">
                        <tr>
                          <th className="px-3 py-2 font-semibold">
                            Organisation
                          </th>
                          <th className="px-3 py-2 text-right font-semibold">
                            Montant
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.topSubs.map((row) => (
                          <tr
                            key={row.id}
                            className="border-b border-border/60 last:border-0"
                          >
                            <td className="px-3 py-2 font-medium">{row.name}</td>
                            <td className="px-3 py-2 text-right font-mono tabular-nums">
                              {formatFcfa(row.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </section>
          ) : null}

          {isHq && subsidiaryFilterId !== "" && orders.length > 0 ? (
            <section className="mt-6">
              <Card className="gap-0 py-4 shadow-sm">
                <CardHeader className="px-4 pb-2">
                  <CardTitle className="text-base">
                    Détail des commandes
                    {selectedSubsidiaryLabel
                      ? ` — ${selectedSubsidiaryLabel}`
                      : ""}
                  </CardTitle>
                  <CardDescription>
                    Commandes fournisseurs pour la filiale sélectionnée.
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-0 pb-2 sm:px-4">
                  <div className="overflow-x-auto">
                    <table className="min-w-[920px] w-full text-left text-sm">
                      <thead className="border-b bg-muted/50">
                        <tr>
                          <th className="px-3 py-2 font-semibold">Date</th>
                          <th className="px-3 py-2 font-semibold">Produit</th>
                          <th className="px-3 py-2 font-semibold">
                            Fournisseur
                          </th>
                          <th className="px-3 py-2 text-right font-semibold">
                            Qté
                          </th>
                          <th className="px-3 py-2 text-right font-semibold">
                            Prix u.
                          </th>
                          <th className="px-3 py-2 text-right font-semibold">
                            Montant
                          </th>
                          <th className="px-3 py-2 font-semibold">Statut</th>
                          <th className="px-3 py-2 font-semibold">Budget</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((o) => (
                          <tr
                            key={o.id}
                            className="border-b border-border/60 last:border-0"
                          >
                            <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                              {new Date(o.createdAt).toLocaleString("fr-FR", {
                                dateStyle: "short",
                                timeStyle: "short",
                              })}
                            </td>
                            <td className="px-3 py-2 font-medium">
                              {o.product.name}
                            </td>
                            <td className="px-3 py-2">{o.supplier.name}</td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {o.quantity}
                            </td>
                            <td className="px-3 py-2 text-right font-mono tabular-nums">
                              {formatFcfa(parseDecimal(o.unitPrice))}
                            </td>
                            <td className="px-3 py-2 text-right font-mono font-medium tabular-nums">
                              {formatFcfa(orderEstimatedFcfa(o))}
                            </td>
                            <td className="px-3 py-2">
                              {STATUS_LABEL[o.status]}
                            </td>
                            <td className="px-3 py-2">
                              <StockOrderBudgetBadge budgetLink={o.budgetLink} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </section>
          ) : null}
        </>
      )}
    </PageShell>
  );
}
