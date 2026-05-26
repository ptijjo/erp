"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertCircle, ArrowRight, Package, Wallet } from "lucide-react";

import {
  CATEGORY_LABEL,
  PLANNED_BAR_FILL,
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
import { hasMePermission, useMe } from "~/hooks/use-me";
import { api } from "~/lib/api";
import type { BudgetOverviewDto } from "~/lib/api-types";
import { formatFcfa } from "~/lib/format-fcfa";

function formatAxis(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)} k`;
  return `${n}`;
}

export function BudgetOverviewDashboard() {
  const { data: me } = useMe();
  const year = new Date().getFullYear();
  const canRead = me != null && hasMePermission(me, "read", "Budget");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["budget", "overview", year] as const,
    queryFn: async () => {
      const { data: overview } = await api.get<BudgetOverviewDto>(
        "/budget/overview",
        { params: { year } },
      );
      return overview;
    },
    enabled: canRead,
  });

  const categoryChart = useMemo(() => {
    const categories = data?.byCategory;
    if (!categories?.length) return [];
    return categories
      .filter((c) => c.plannedFcfa > 0 || c.spentFcfa > 0)
      .map((c) => ({
        name: CATEGORY_LABEL[c.category],
        prevu: c.plannedFcfa,
        depense: c.spentFcfa,
      }));
  }, [data]);

  if (!canRead) return null;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-48 w-full" />
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
            Synthèse budget indisponible
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  const pendingTotal =
    data.workflow.budgetsPendingApproval +
    data.workflow.supplementsPendingFinance +
    data.workflow.supplementsPendingDirectors;

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wallet className="size-4 text-primary" />
            Budget groupe {data.year}
          </CardTitle>
          <CardDescription>
            Prévu {formatFcfa(data.totals.plannedFcfa)} — dépensé{" "}
            {formatFcfa(data.totals.spentFcfa)} (
            {data.totals.utilizationPercent.toFixed(0)} %)
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/budgets">
            Détail budgets
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap gap-2">
          {pendingTotal > 0 ? (
            <>
              {data.workflow.budgetsPendingApproval > 0 ? (
                <Badge variant="secondary">
                  {data.workflow.budgetsPendingApproval} budget(s) à valider
                </Badge>
              ) : null}
              {data.workflow.supplementsPendingFinance > 0 ? (
                <Badge variant="secondary">
                  {data.workflow.supplementsPendingFinance} rallonge(s) finance
                </Badge>
              ) : null}
              {data.workflow.supplementsPendingDirectors > 0 ? (
                <Badge variant="secondary">
                  {data.workflow.supplementsPendingDirectors} rallonge(s) DG
                </Badge>
              ) : null}
            </>
          ) : (
            <Badge variant="outline">Aucune action workflow en attente</Badge>
          )}
          {data.stockOrders.pending > 0 ? (
            <Badge variant="outline" className="gap-1">
              <Package className="size-3" />
              {data.stockOrders.pending} commande(s) stock en attente
            </Badge>
          ) : null}
        </div>

        {categoryChart.length > 0 ? (
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryChart} margin={{ left: 8, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                  height={56}
                />
                <YAxis tickFormatter={formatAxis} width={48} />
                <Tooltip
                  formatter={(value) => formatFcfa(Number(value ?? 0))}
                />
                <Bar dataKey="prevu" name="Prévu" fill={PLANNED_BAR_FILL} />
                <Bar dataKey="depense" name="Dépensé" fill={SPENT_BAR_FILL} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Aucun budget validé pour {data.year} — les graphiques apparaîtront
            après validation des budgets filiales.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
