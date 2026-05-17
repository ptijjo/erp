"use client";

import { useMemo } from "react";
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
import { PieChart as PieChartIcon, TrendingUp, Wallet } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import type { BudgetDto, BudgetLineCategoryDto } from "~/lib/api-types";
import { formatFcfa } from "~/lib/format-fcfa";
import { parseDecimal } from "~/lib/parse-decimal";

import {
  CATEGORY_CHART_COLORS,
  CATEGORY_LABEL,
  PLANNED_BAR_FILL,
  SPENT_BAR_FILL,
} from "../_lib/budget-constants";

function formatFcfaAxis(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)} Md`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)} k`;
  return `${n}`;
}

type BudgetChartsProps = {
  budget: BudgetDto;
  spentByLineId: Map<string, number>;
};

function lineShortLabel(category: BudgetLineCategoryDto, label: string): string {
  const base = CATEGORY_LABEL[category];
  const rest = label.length > 18 ? `${label.slice(0, 16)}…` : label;
  return `${base} — ${rest}`;
}

export function BudgetCharts({ budget, spentByLineId }: BudgetChartsProps) {
  const lineRows = useMemo(() => {
    return budget.lines.map((l) => {
      const prevu = parseDecimal(l.amountPlanned);
      const depense = spentByLineId.get(l.id) ?? 0;
      return {
        id: l.id,
        name: lineShortLabel(l.category, l.label),
        prevu,
        depense,
        ecart: prevu - depense,
        category: l.category,
      };
    });
  }, [budget.lines, spentByLineId]);

  const totals = useMemo(() => {
    const prevu = lineRows.reduce((s, r) => s + r.prevu, 0);
    const depense = lineRows.reduce((s, r) => s + r.depense, 0);
    const taux = prevu > 0 ? Math.min(100, Math.round((depense / prevu) * 100)) : 0;
    return { prevu, depense, reste: prevu - depense, taux };
  }, [lineRows]);

  const categoryPie = useMemo(() => {
    const byCat = new Map<BudgetLineCategoryDto, number>();
    for (const row of lineRows) {
      byCat.set(row.category, (byCat.get(row.category) ?? 0) + row.depense);
    }
    return Array.from(byCat.entries())
      .filter(([, v]) => v > 0)
      .map(([category, value]) => ({
        name: CATEGORY_LABEL[category],
        value,
        category,
      }));
  }, [lineRows]);

  return (
    <div className="mt-6 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="gap-0 py-3 shadow-sm">
          <CardHeader className="px-4 pb-1">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Wallet className="size-4 text-primary" />
              Budget prévu
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pt-0">
            <p className="text-xl font-bold tabular-nums text-foreground">
              {formatFcfa(totals.prevu)}
            </p>
          </CardContent>
        </Card>
        <Card className="gap-0 py-3 shadow-sm">
          <CardHeader className="px-4 pb-1">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <TrendingUp className="size-4 text-primary" />
              Dépensé
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pt-0">
            <p className="text-xl font-bold tabular-nums text-foreground">
              {formatFcfa(totals.depense)}
            </p>
          </CardContent>
        </Card>
        <Card className="gap-0 py-3 shadow-sm">
          <CardHeader className="px-4 pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Reste disponible
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pt-0">
            <p
              className={`text-xl font-bold tabular-nums ${
                totals.reste < 0 ? "text-destructive" : "text-emerald-700"
              }`}
            >
              {formatFcfa(totals.reste)}
            </p>
          </CardContent>
        </Card>
        <Card className="gap-0 py-3 shadow-sm">
          <CardHeader className="px-4 pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Taux de consommation
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pt-0">
            <p className="text-xl font-bold tabular-nums text-foreground">
              {totals.taux} %
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${totals.taux}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="py-4 lg:col-span-2">
          <CardHeader className="px-4 pb-2">
            <CardTitle className="text-base">Prévu vs dépensé par ligne</CardTitle>
            <CardDescription>
              Comparaison FCFA ligne par ligne sur la période sélectionnée
            </CardDescription>
          </CardHeader>
          <CardContent className="px-2 pb-4 sm:px-4">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={lineRows}
                margin={{ top: 8, right: 8, left: 0, bottom: 48 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  angle={-22}
                  textAnchor="end"
                  height={72}
                  interval={0}
                />
                <YAxis tickFormatter={formatFcfaAxis} width={56} />
                <Tooltip
                  formatter={(value, name) => {
                    const n =
                      typeof value === "number" ? value : Number(value ?? 0);
                    const label =
                      name === "prevu" || name === "Prévu"
                        ? "Prévu"
                        : "Dépensé";
                    return [formatFcfa(n), label];
                  }}
                />
                <Legend
                  formatter={(v) => (v === "prevu" ? "Prévu" : "Dépensé")}
                />
                <Bar
                  dataKey="prevu"
                  name="prevu"
                  fill={PLANNED_BAR_FILL}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
                <Bar
                  dataKey="depense"
                  name="depense"
                  fill={SPENT_BAR_FILL}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="py-4">
          <CardHeader className="px-4 pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <PieChartIcon className="size-4 text-primary" />
              Répartition des sorties
            </CardTitle>
            <CardDescription>Par catégorie (loyer, salaires…)</CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-2">
            {categoryPie.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                Aucune sortie enregistrée pour afficher le graphique.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={categoryPie}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={88}
                    paddingAngle={2}
                  >
                    {categoryPie.map((entry) => (
                      <Cell
                        key={entry.category}
                        fill={CATEGORY_CHART_COLORS[entry.category]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) =>
                      formatFcfa(
                        typeof value === "number" ? value : Number(value ?? 0),
                      )
                    }
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
