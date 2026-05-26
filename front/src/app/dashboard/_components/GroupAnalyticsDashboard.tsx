"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Layers,
  Package,
  UserCircle,
  Wallet,
} from "lucide-react";

import {
  CATEGORY_LABEL,
  MONTHS_FR,
  PLANNED_BAR_FILL,
  REVENUE_BAR_FILL,
  SPENT_BAR_FILL,
} from "~/app/dashboard/budgets/_lib/budget-constants";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { isMainOrganization, useMe } from "~/hooks/use-me";
import { hasAnalyticsAccess } from "~/lib/dashboard-navigation";
import { api } from "~/lib/api";
import type { GroupAnalyticsOverviewDto } from "~/lib/api-types";
import { formatFcfa } from "~/lib/format-fcfa";

function formatAxis(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)} k`;
  return `${n}`;
}

type GroupAnalyticsDashboardProps = {
  /** Vue compacte sur l’accueil ; vue complète sur /dashboard/rapports */
  variant?: "compact" | "full";
  year?: number;
  subsidiaryOrganizationId?: string;
};

export function GroupAnalyticsDashboard({
  variant = "compact",
  year: yearProp,
  subsidiaryOrganizationId,
}: GroupAnalyticsDashboardProps) {
  const { data: me } = useMe();
  const [yearState] = useState(() => new Date().getFullYear());
  const year = yearProp ?? yearState;
  const canAccess = me != null && hasAnalyticsAccess(me);
  const isFull = variant === "full";
  const main = me != null && isMainOrganization(me);

  const { data, isLoading, isError } = useQuery({
    queryKey: [
      "analytics",
      "overview",
      year,
      subsidiaryOrganizationId ?? "all",
    ] as const,
    queryFn: async () => {
      const { data: overview } = await api.get<GroupAnalyticsOverviewDto>(
        "/analytics/overview",
        {
          params: {
            year,
            ...(subsidiaryOrganizationId
              ? { subsidiaryOrganizationId }
              : {}),
          },
        },
      );
      return overview;
    },
    enabled: canAccess,
  });

  const categoryChart = useMemo(() => {
    const categories = data?.budget?.byCategory;
    if (!categories?.length) return [];
    return categories
      .filter((c) => c.plannedFcfa > 0 || c.spentFcfa > 0)
      .map((c) => ({
        name: CATEGORY_LABEL[c.category],
        prevu: c.plannedFcfa,
        depense: c.spentFcfa,
      }));
  }, [data]);

  const spendingChart = useMemo(() => {
    const rows = data?.spendingByMonth;
    if (!rows?.length) return [];
    return rows.map((row) => ({
      name: MONTHS_FR[row.month - 1] ?? `${row.month}`,
      depense: row.spentFcfa,
    }));
  }, [data]);

  const cashflowChart = useMemo(() => {
    const rows = data?.financial?.cashflowByMonth;
    if (!rows?.length) return [];
    return rows.map((row) => ({
      name: MONTHS_FR[row.month - 1] ?? `${row.month}`,
      recettes: row.revenueFcfa,
      depenses: row.spentFcfa,
    }));
  }, [data]);

  const subsidiaryBudgetChart = useMemo(() => {
    const subsidiaries = data?.budget?.bySubsidiary;
    if (!subsidiaries?.length) return [];
    return subsidiaries.map((s) => ({
      name: s.name.length > 14 ? `${s.name.slice(0, 12)}…` : s.name,
      prevu: s.plannedFcfa,
      depense: s.spentFcfa,
    }));
  }, [data]);

  if (!canAccess) return null;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-80" />
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (isError || !data) {
    return (
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertCircle className="size-4 text-destructive" />
            Synthèse indisponible
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="size-4 text-primary" />
              {main ? "Synthèse groupe" : "Synthèse activité"} — {data.year}
            </CardTitle>
            <CardDescription>
              Recettes, dépenses, budgets, stocks et RH selon vos droits d’accès.
            </CardDescription>
          </div>
          {!isFull ? (
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/rapports">
                Rapports détaillés
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {data.financial ? (
              <KpiCard
                icon={Wallet}
                label="Chiffre d’affaires"
                value={formatFcfa(data.financial.revenueFcfa)}
                hint={`Dépenses ${formatFcfa(data.financial.expensesFcfa)} · Net ${formatFcfa(data.financial.netFcfa)}`}
              />
            ) : null}
            {data.budget ? (
              <KpiCard
                icon={Wallet}
                label="Budget (dépensé / prévu)"
                value={`${data.budget.totals.utilizationPercent.toFixed(0)} %`}
                hint={`${formatFcfa(data.budget.totals.spentFcfa)} / ${formatFcfa(data.budget.totals.plannedFcfa)}`}
              />
            ) : null}
            {data.hr ? (
              <KpiCard
                icon={UserCircle}
                label="Employés actifs"
                value={String(data.hr.employeesActive)}
                hint={
                  data.hr.leaveRequestsPending > 0
                    ? `${data.hr.leaveRequestsPending} congé(s) en attente`
                    : `${data.hr.employeesTotal} au total`
                }
              />
            ) : null}
            {data.stock ? (
              <KpiCard
                icon={Layers}
                label="Alertes stock bas"
                value={String(data.stock.lowStockLines)}
                hint={`${data.stock.stockLines} ligne(s) de stock`}
              />
            ) : null}
            {data.stockOrders ? (
              <KpiCard
                icon={Package}
                label="Commandes en attente"
                value={String(data.stockOrders.pending)}
                hint={`${formatFcfa(data.stockOrders.confirmedYearTotalFcfa)} confirmées (${data.year})`}
              />
            ) : null}
            {data.catalog && main ? (
              <KpiCard
                icon={Package}
                label="Catalogue"
                value={String(data.catalog.productsOfferedToSubsidiaries)}
                hint={`${data.catalog.productsTotal} produits · ${data.catalog.subsidiariesCount} filiales`}
              />
            ) : null}
          </div>

          {data.budget ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {data.budget.workflow.budgetsPendingApproval > 0 ? (
                <Badge variant="secondary">
                  {data.budget.workflow.budgetsPendingApproval} budget(s) à
                  valider
                </Badge>
              ) : null}
              {data.budget.stockOrders.pending > 0 ? (
                <Badge variant="outline">
                  {data.budget.stockOrders.pending} commande(s) stock en attente
                </Badge>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {isFull && cashflowChart.some((r) => r.recettes > 0 || r.depenses > 0) ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recettes vs dépenses</CardTitle>
            <CardDescription>
              CA des ventes confirmées et sorties budgétaires ({data.year}).
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cashflowChart}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={formatAxis} width={48} />
                <Tooltip formatter={(v) => formatFcfa(Number(v ?? 0))} />
                <Bar dataKey="recettes" name="Recettes" fill={REVENUE_BAR_FILL} />
                <Bar dataKey="depenses" name="Dépenses" fill={SPENT_BAR_FILL} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      ) : null}

      {isFull && spendingChart.some((r) => r.depense > 0) ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dépenses réelles par mois</CardTitle>
            <CardDescription>
              Sorties budgétaires enregistrées sur budgets validés ({data.year}
              ).
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={spendingChart}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={formatAxis} width={48} />
                <Tooltip
                  formatter={(v) => formatFcfa(Number(v ?? 0))}
                />
                <Line
                  type="monotone"
                  dataKey="depense"
                  name="Dépensé"
                  stroke={SPENT_BAR_FILL}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      ) : null}

      <div
        className={
          isFull
            ? "grid gap-6 lg:grid-cols-2"
            : "grid gap-6 lg:grid-cols-1"
        }
      >
        {categoryChart.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Budget par catégorie</CardTitle>
            </CardHeader>
            <CardContent className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryChart}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10 }}
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                    height={56}
                  />
                  <YAxis tickFormatter={formatAxis} width={48} />
                  <Tooltip
                  formatter={(v) => formatFcfa(Number(v ?? 0))}
                />
                  <Bar dataKey="prevu" name="Prévu" fill={PLANNED_BAR_FILL} />
                  <Bar dataKey="depense" name="Dépensé" fill={SPENT_BAR_FILL} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ) : null}

        {isFull && subsidiaryBudgetChart.length > 1 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Budget par filiale</CardTitle>
            </CardHeader>
            <CardContent className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subsidiaryBudgetChart}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={formatAxis} width={48} />
                  <Tooltip
                  formatter={(v) => formatFcfa(Number(v ?? 0))}
                />
                  <Bar dataKey="prevu" name="Prévu" fill={PLANNED_BAR_FILL} />
                  <Bar dataKey="depense" name="Dépensé" fill={SPENT_BAR_FILL} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ) : null}
      </div>

      {isFull && data.hr && data.hr.bySubsidiary.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">RH par filiale</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Filiale</th>
                  <th className="pb-2 pr-4 font-medium">Actifs</th>
                  <th className="pb-2 font-medium">Congés en attente</th>
                </tr>
              </thead>
              <tbody>
                {data.hr.bySubsidiary.map((row) => (
                  <tr key={row.organizationId} className="border-b border-border/50">
                    <td className="py-2 pr-4">{row.name}</td>
                    <td className="py-2 pr-4 tabular-nums">{row.employeesActive}</td>
                    <td className="py-2 tabular-nums">{row.leavePending}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : null}

      {isFull && data.financial && data.financial.bySubsidiary.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Performance par filiale (CA & budget)
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Filiale</th>
                  <th className="pb-2 pr-4 font-medium text-right">CA</th>
                  <th className="pb-2 pr-4 font-medium text-right">Dépenses</th>
                  <th className="pb-2 font-medium text-right">Budget</th>
                </tr>
              </thead>
              <tbody>
                {data.financial.bySubsidiary.map((row) => (
                  <tr
                    key={row.organizationId}
                    className="border-b border-border/50"
                  >
                    <td className="py-2 pr-4">
                      {row.name}
                      {row.overBudget ? (
                        <Badge variant="destructive" className="ml-2">
                          Dépassement
                        </Badge>
                      ) : row.atRisk ? (
                        <Badge variant="secondary" className="ml-2">
                          ≥ 90 %
                        </Badge>
                      ) : null}
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums">
                      {formatFcfa(row.revenueFcfa)}
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums">
                      {formatFcfa(row.expensesFcfa)}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {row.plannedFcfa > 0
                        ? `${row.utilizationPercent.toFixed(0)} %`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : null}

      {isFull &&
      data.productRotation &&
      data.productRotation.topSellers.length > 0 ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Meilleures ventes</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="pb-2 font-medium">Produit</th>
                    <th className="pb-2 text-right font-medium">Qté</th>
                    <th className="pb-2 text-right font-medium">CA</th>
                  </tr>
                </thead>
                <tbody>
                  {data.productRotation.topSellers.map((p) => (
                    <tr key={p.productId} className="border-b border-border/50">
                      <td className="py-2">{p.productName}</td>
                      <td className="py-2 text-right tabular-nums">
                        {p.quantitySold}
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {formatFcfa(p.revenueFcfa)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Stock dormant</CardTitle>
              <CardDescription>
                Produits en stock avec peu de ventes sur l’année.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="pb-2 font-medium">Produit</th>
                    <th className="pb-2 text-right font-medium">Stock</th>
                    <th className="pb-2 text-right font-medium">Vendus</th>
                  </tr>
                </thead>
                <tbody>
                  {data.productRotation.slowMovers.map((p) => (
                    <tr key={p.productId} className="border-b border-border/50">
                      <td className="py-2">{p.productName}</td>
                      <td className="py-2 text-right tabular-nums">
                        {p.stockQuantity}
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {p.quantitySoldYear}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {isFull && data.stock && data.stock.bySubsidiary.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Stocks par filiale</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Filiale</th>
                  <th className="pb-2 pr-4 font-medium">Lignes</th>
                  <th className="pb-2 font-medium">Sous seuil</th>
                </tr>
              </thead>
              <tbody>
                {data.stock.bySubsidiary.map((row) => (
                  <tr key={row.organizationId} className="border-b border-border/50">
                    <td className="py-2 pr-4">{row.name}</td>
                    <td className="py-2 pr-4 tabular-nums">{row.stockLines}</td>
                    <td className="py-2 tabular-nums text-amber-800">
                      {row.lowStockLines}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4" />
        <span className="text-xs font-medium uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
