"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Lock, Unlock } from "lucide-react";

import { PageHeader } from "~/components/layout/page-header";
import { PageShell } from "~/components/layout/page-shell";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  hasMePermission,
  isMainOrganization,
  useMe,
} from "~/hooks/use-me";
import { api } from "~/lib/api";
import type {
  AccountingPeriodClosureDto,
  OrganizationDto,
} from "~/lib/api-types";
import { apiErrorMessage } from "~/lib/api-error-message";
import { MONTHS_FR } from "~/app/dashboard/budgets/_lib/budget-constants";

const ALL_ORGS = "all";

export default function TresoreriePage() {
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  const main = me != null && isMainOrganization(me);
  const canRead =
    me != null && hasMePermission(me, "read", "AccountingPeriod");
  const canManage =
    me != null && hasMePermission(me, "manage", "AccountingPeriod");

  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [orgScope, setOrgScope] = useState(ALL_ORGS);

  const { data: closures = [], isLoading } = useQuery({
    queryKey: ["treasury", "accounting-periods", year] as const,
    queryFn: async () => {
      const { data } = await api.get<AccountingPeriodClosureDto[]>(
        "/treasury/accounting-periods",
        { params: { year } },
      );
      return data;
    },
    enabled: canRead,
  });

  const { data: organizations = [] } = useQuery({
    queryKey: ["organisation"] as const,
    queryFn: async () => {
      const { data } = await api.get<OrganizationDto[]>("/organisation");
      return data;
    },
    enabled: main && canManage,
  });

  const subsidiaries = useMemo(
    () => organizations.filter((o) => o.organizationType === "SUBSIDIARY"),
    [organizations],
  );

  const closedSet = useMemo(() => {
    const set = new Set<string>();
    for (const c of closures) {
      const key = `${c.year}-${c.month}-${c.organization?.id ?? "GROUP"}`;
      set.add(key);
    }
    return set;
  }, [closures]);

  const isMonthClosed = (y: number, m: number, orgId?: string) => {
    if (closedSet.has(`${y}-${m}-GROUP`)) return true;
    if (orgId && closedSet.has(`${y}-${m}-${orgId}`)) return true;
    return false;
  };

  const closeMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<AccountingPeriodClosureDto>(
        "/treasury/accounting-periods/close",
        {
          year,
          month,
          ...(orgScope !== ALL_ORGS ? { organizationId: orgScope } : {}),
        },
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["treasury", "accounting-periods"],
      });
      alert("Période clôturée. Les ventes et sorties budgétaires rétroactives sont bloquées.");
    },
    onError: (e) => {
      alert(apiErrorMessage(e, "Clôture impossible"));
    },
  });

  if (!canRead) {
    return (
      <PageShell>
        <PageHeader
          title="Trésorerie"
          description="Vous n’avez pas accès aux clôtures comptables."
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Trésorerie — clôtures mensuelles"
        description="Verrouillez un mois pour empêcher toute vente ou dépense rétroactive sur cette période."
      />

      {canManage ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lock className="size-4" />
              Clôturer une période
            </CardTitle>
            <CardDescription>
              {main
                ? "Clôture groupe (toutes filiales) ou une filiale seule."
                : "Clôture pour votre filiale uniquement."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-4">
            <div>
              <Label htmlFor="close-year">Année</Label>
              <Input
                id="close-year"
                type="number"
                className="mt-1 w-28"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              />
            </div>
            <div>
              <Label>Mois</Label>
              <Select
                value={String(month)}
                onValueChange={(v) => setMonth(Number(v))}
              >
                <SelectTrigger className="mt-1 w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS_FR.map((label, i) => (
                    <SelectItem key={label} value={String(i + 1)}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {main ? (
              <div>
                <Label>Périmètre</Label>
                <Select value={orgScope} onValueChange={setOrgScope}>
                  <SelectTrigger className="mt-1 w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_ORGS}>
                      Groupe (toutes filiales)
                    </SelectItem>
                    {subsidiaries.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <Button
              onClick={() => closeMutation.mutate()}
              disabled={
                closeMutation.isPending ||
                isMonthClosed(
                  year,
                  month,
                  orgScope !== ALL_ORGS ? orgScope : undefined,
                )
              }
            >
              Clôturer {MONTHS_FR[month - 1]} {year}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card className="mt-6">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base">Historique des clôtures</CardTitle>
            <CardDescription>
              Périodes verrouillées pour l’année {year}.
            </CardDescription>
          </div>
          <Select
            value={String(year)}
            onValueChange={(v) => setYear(Number(v))}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[currentYear, currentYear - 1].map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : closures.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune clôture enregistrée pour cette année.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="pb-2 pr-4">Période</th>
                    <th className="pb-2 pr-4">Organisation</th>
                    <th className="pb-2 pr-4">Clôturée le</th>
                    <th className="pb-2">Par</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {closures.map((c) => (
                    <tr key={c.id}>
                      <td className="py-2 pr-4">
                        {MONTHS_FR[c.month - 1]} {c.year}
                        <Badge variant="secondary" className="ml-2">
                          <Lock className="mr-1 size-3 inline" />
                          Verrouillée
                        </Badge>
                      </td>
                      <td className="py-2 pr-4">
                        {c.organization?.name ?? "Groupe VIFAA"}
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground">
                        {new Date(c.closedAt).toLocaleString("fr-FR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="py-2 text-muted-foreground">
                        {c.closedBy.firstName || c.closedBy.lastName
                          ? `${c.closedBy.firstName ?? ""} ${c.closedBy.lastName ?? ""}`.trim()
                          : c.closedBy.email}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6 border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-muted-foreground">
            <Unlock className="size-4" />
            Calendrier {year}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {MONTHS_FR.map((label, i) => {
              const m = i + 1;
              const closed = isMonthClosed(year, m);
              return (
                <div
                  key={label}
                  className={`rounded-lg border px-3 py-2 text-center text-sm ${
                    closed
                      ? "border-primary/30 bg-primary/5 font-medium"
                      : "text-muted-foreground"
                  }`}
                >
                  {label}
                  {closed ? (
                    <Lock className="mx-auto mt-1 size-3 text-primary" />
                  ) : null}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </PageShell>
  );
}
