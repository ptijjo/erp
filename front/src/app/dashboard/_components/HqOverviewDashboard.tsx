"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertCircle,
  Building2,
  Package,
  TrendingDown,
  TrendingUp,
  UserCircle,
  Wallet,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { HqKpiCard } from "~/app/dashboard/_components/HqKpiCard";
import {
  CHART_BAR_MOTION,
  CHART_LINE_MOTION,
} from "~/app/dashboard/_lib/chart-motion";
import {
  MONTHS_FR,
  REVENUE_BAR_FILL,
  SPENT_BAR_FILL,
} from "~/app/dashboard/budgets/_lib/budget-constants";
import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Skeleton } from "~/components/ui/skeleton";
import { hasAnalyticsAccess } from "~/lib/dashboard-navigation";
import { useMe } from "~/hooks/use-me";
import { api } from "~/lib/api";
import { fetchOrganizations } from "~/lib/api-list";
import type { GroupAnalyticsOverviewDto } from "~/lib/api-types";
import { formatFcfa } from "~/lib/format-fcfa";
import { useSubsidiaryContext } from "~/providers/subsidiary-context";

const ALL_SUBSIDIARIES = "__all__";

function formatAxis(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)} k`;
  return `${n}`;
}

type RecentItem = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  badge: string;
  badgeVariant: "default" | "secondary" | "destructive" | "outline";
};

function buildRecentItems(data: GroupAnalyticsOverviewDto): RecentItem[] {
  const items: RecentItem[] = [];

  if (data.budget?.workflow.budgetsPendingApproval) {
    items.push({
      id: "budget-pending",
      title: "Budgets en attente de validation",
      subtitle: "Maison mère · Finance",
      href: "/dashboard/budgets",
      badge: `${data.budget.workflow.budgetsPendingApproval} en attente`,
      badgeVariant: "secondary",
    });
  }

  if (data.stockOrders?.pending) {
    items.push({
      id: "stock-pending",
      title: "Commandes stock en attente",
      subtitle: "Filiales · Approvisionnement",
      href: "/dashboard/comptabilite",
      badge: `${data.stockOrders.pending} commande(s)`,
      badgeVariant: "default",
    });
  }

  if (data.budget?.workflow.supplementsPendingFinance) {
    items.push({
      id: "supplement-finance",
      title: "Demandes de supplément budget",
      subtitle: "Pôle finance",
      href: "/dashboard/budgets",
      badge: `${data.budget.workflow.supplementsPendingFinance} à traiter`,
      badgeVariant: "outline",
    });
  }

  if (data.hr?.leaveRequestsPending) {
    items.push({
      id: "leave-pending",
      title: "Demandes de congé en attente",
      subtitle: "Ressources humaines",
      href: "/dashboard/rh/conges",
      badge: `${data.hr.leaveRequestsPending} demande(s)`,
      badgeVariant: "secondary",
    });
  }

  return items.slice(0, 6);
}

export function HqOverviewDashboard() {
  const { data: me } = useMe();
  const { selectedSubsidiaryId, setSelectedSubsidiaryId } =
    useSubsidiaryContext();
  const year = new Date().getFullYear();
  const canAccess = me != null && hasAnalyticsAccess(me);

  const overviewQuery = useQuery({
    queryKey: [
      "analytics",
      "overview",
      year,
      selectedSubsidiaryId ?? "all",
    ] as const,
    queryFn: async () => {
      const { data } = await api.get<GroupAnalyticsOverviewDto>(
        "/analytics/overview",
        {
          params: {
            year,
            ...(selectedSubsidiaryId
              ? { subsidiaryOrganizationId: selectedSubsidiaryId }
              : {}),
          },
        },
      );
      return data;
    },
    enabled: canAccess,
  });

  const organisationsQuery = useQuery({
    queryKey: ["organisation"] as const,
    queryFn: fetchOrganizations,
    enabled: canAccess,
  });

  const revenueChart = useMemo(() => {
    const rows = overviewQuery.data?.financial?.revenueByMonth;
    if (!rows?.length) return [];
    return rows.map((row) => ({
      name: MONTHS_FR[row.month - 1] ?? `${row.month}`,
      revenus: row.revenueFcfa,
    }));
  }, [overviewQuery.data]);

  const cashflowChart = useMemo(() => {
    const rows = overviewQuery.data?.financial?.cashflowByMonth;
    if (!rows?.length) return [];
    return rows.map((row) => ({
      name: MONTHS_FR[row.month - 1] ?? `${row.month}`,
      recettes: row.revenueFcfa,
      depenses: row.spentFcfa,
    }));
  }, [overviewQuery.data]);

  const subsidiaryChart = useMemo(() => {
    if (selectedSubsidiaryId) return [];
    const rows = overviewQuery.data?.financial?.bySubsidiary ?? [];
    return rows.map((row) => ({
      name: row.name.length > 16 ? `${row.name.slice(0, 14)}…` : row.name,
      recettes: row.revenueFcfa,
      depenses: row.expensesFcfa,
    }));
  }, [overviewQuery.data, selectedSubsidiaryId]);

  const subsidiaries = useMemo(
    () =>
      organisationsQuery.data?.filter(
        (org) => org.organizationType === "SUBSIDIARY",
      ) ?? [],
    [organisationsQuery.data],
  );

  const selectedSubsidiaryName =
    subsidiaries.find((org) => org.id === selectedSubsidiaryId)?.name ?? null;

  const recentItems = useMemo(() => {
    if (!overviewQuery.data) return [];
    return buildRecentItems(overviewQuery.data);
  }, [overviewQuery.data]);

  const subsidiariesTotal = subsidiaries.length;

  const isLoading = overviewQuery.isLoading || organisationsQuery.isLoading;
  const isError = overviewQuery.isError || organisationsQuery.isError;

  if (!canAccess) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">Vue groupe indisponible</CardTitle>
          <CardDescription>
            Votre rôle ne permet pas encore d’accéder à la synthèse consolidée
            du groupe.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const scopeFilter = (
    <div className="flex flex-wrap items-center gap-2">
      <Building2 className="size-4 text-muted-foreground" aria-hidden />
      <Select
        value={selectedSubsidiaryId ?? ALL_SUBSIDIARIES}
        onValueChange={(value) =>
          setSelectedSubsidiaryId(value === ALL_SUBSIDIARIES ? null : value)
        }
      >
        <SelectTrigger className="w-[min(100%,16rem)]" aria-label="Filiale">
          <SelectValue placeholder="Vue globale" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_SUBSIDIARIES}>Vue globale</SelectItem>
          {subsidiaries.map((org) => (
            <SelectItem key={org.id} value={org.id}>
              {org.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        {scopeFilter}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-32 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  if (isError || !overviewQuery.data) {
    return (
      <div className="space-y-6">
        {scopeFilter}
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertCircle className="size-4 text-destructive" />
            Synthèse indisponible
          </CardTitle>
          <CardDescription>
            Impossible de charger les indicateurs consolidés du groupe.
          </CardDescription>
        </CardHeader>
      </Card>
      </div>
    );
  }

  const data = overviewQuery.data;
  const financial = data.financial;
  const activeSubsidiaries =
    data.financial?.bySubsidiary.filter((row) => !row.overBudget).length ??
    subsidiariesTotal;

  const scopeLabel = selectedSubsidiaryName ?? "groupe";

  return (
    <div className="space-y-8">
      {scopeFilter}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {selectedSubsidiaryId ? null : (
        <HqKpiCard
          label="Filiales actives"
          value={String(activeSubsidiaries)}
          hint={`${subsidiariesTotal} au total`}
          icon={Building2}
          iconClassName="bg-amber-100 text-amber-700"
        />
        )}
        {financial ? (
          <>
            <HqKpiCard
              label="Revenus totaux"
              value={formatFcfa(financial.revenueFcfa)}
              hint={`${scopeLabel} · ${data.year}`}
              icon={TrendingUp}
              iconClassName="bg-emerald-100 text-emerald-700"
            />
            <HqKpiCard
              label="Dépenses totales"
              value={formatFcfa(financial.expensesFcfa)}
              hint={`${scopeLabel} · ${data.year}`}
              icon={TrendingDown}
              iconClassName="bg-red-100 text-red-700"
            />
            <HqKpiCard
              label="Bénéfice net"
              value={formatFcfa(financial.netFcfa)}
              hint="Recettes − dépenses"
              icon={Wallet}
              iconClassName="bg-emerald-100 text-emerald-700"
            />
          </>
        ) : null}
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {data.hr ? (
          <HqKpiCard
            label="Employés actifs"
            value={String(data.hr.employeesActive)}
            hint={`${data.hr.employeesTotal} au total · ${data.hr.leaveRequestsPending} congé(s) en attente`}
            icon={UserCircle}
            iconClassName="bg-sky-100 text-sky-700"
          />
        ) : null}
        {data.stockOrders ? (
          <HqKpiCard
            label="Commandes en cours"
            value={String(data.stockOrders.pending)}
            hint={`${data.stockOrders.confirmed} confirmée(s) · ${formatFcfa(data.stockOrders.confirmedYearTotalFcfa)}`}
            icon={Package}
            iconClassName="bg-sky-100 text-sky-700"
          />
        ) : null}
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Évolution des revenus</CardTitle>
            <CardDescription>
              Recettes par mois — {scopeLabel}, {data.year}.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {revenueChart.some((row) => row.revenus > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={revenueChart}
                  key={`revenus-${selectedSubsidiaryId ?? "all"}`}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={formatAxis} width={48} />
                  <Tooltip formatter={(value) => formatFcfa(Number(value ?? 0))} />
                  <Line
                    type="monotone"
                    dataKey="revenus"
                    name="Revenus"
                    stroke={REVENUE_BAR_FILL}
                    strokeWidth={2}
                    dot={false}
                    {...CHART_LINE_MOTION}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Aucune recette enregistrée sur la période.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">Suivi opérationnel</CardTitle>
              <CardDescription>
                Points d’attention consolidés du groupe.
              </CardDescription>
            </div>
            {recentItems.length > 0 ? (
              <Badge variant="secondary">{recentItems.length}</Badge>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-3">
            {recentItems.length > 0 ? (
              recentItems.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="block rounded-lg border bg-muted/20 p-3 transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium leading-snug">{item.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.subtitle}
                      </p>
                    </div>
                    <Badge variant={item.badgeVariant} className="shrink-0">
                      {item.badge}
                    </Badge>
                  </div>
                </Link>
              ))
            ) : (
              <div className="flex h-48 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
                <Activity className="size-5" />
                Aucun point d’attention pour le moment.
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recettes et dépenses</CardTitle>
          <CardDescription>
            Flux mensuel — {scopeLabel}, {data.year}.
          </CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          {cashflowChart.some((row) => row.recettes > 0 || row.depenses > 0) ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={cashflowChart}
                key={`flux-${selectedSubsidiaryId ?? "all"}`}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={formatAxis} width={48} />
                <Tooltip formatter={(value) => formatFcfa(Number(value ?? 0))} />
                <Legend />
                <Bar
                  dataKey="recettes"
                  name="Recettes"
                  fill={REVENUE_BAR_FILL}
                  radius={2}
                  {...CHART_BAR_MOTION}
                />
                <Bar
                  dataKey="depenses"
                  name="Dépenses"
                  fill={SPENT_BAR_FILL}
                  radius={2}
                  {...CHART_BAR_MOTION}
                  animationBegin={80}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Aucun flux sur la période.
            </div>
          )}
        </CardContent>
      </Card>

      {subsidiaryChart.length > 1 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Comparaison des filiales</CardTitle>
            <CardDescription>Recettes et dépenses de l’année {data.year}.</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={subsidiaryChart} key="filiales">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
                <YAxis tickFormatter={formatAxis} width={48} />
                <Tooltip formatter={(value) => formatFcfa(Number(value ?? 0))} />
                <Legend />
                <Bar
                  dataKey="recettes"
                  name="Recettes"
                  fill={REVENUE_BAR_FILL}
                  radius={2}
                  {...CHART_BAR_MOTION}
                />
                <Bar
                  dataKey="depenses"
                  name="Dépenses"
                  fill={SPENT_BAR_FILL}
                  radius={2}
                  {...CHART_BAR_MOTION}
                  animationBegin={80}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
