"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Banknote, Link2 } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "~/components/layout/page-header";
import { PageShell } from "~/components/layout/page-shell";
import { Button } from "~/components/ui/button";
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
import {
  hasMePermission,
  isMainOrganization,
  useMe,
} from "~/hooks/use-me";
import { api } from "~/lib/api";
import { fetchOrganizations } from "~/lib/api-list";
import type { TreasuryOverviewDto } from "~/lib/api-types";
import { formatFcfa } from "~/lib/format-fcfa";
import { MONTHS_FR } from "~/app/dashboard/budgets/_lib/budget-constants";

const ALL_ORGS = "all";

export default function TresoreriePage() {
  const { data: me } = useMe();
  const main = me != null && isMainOrganization(me);
  const canRead =
    me != null && hasMePermission(me, "read", "SessionCaisse");
  const canReadClosures =
    me != null && hasMePermission(me, "read", "AccountingPeriod");

  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [orgScope, setOrgScope] = useState(ALL_ORGS);

  const { data: organizations = [] } = useQuery({
    queryKey: ["organisation"] as const,
    queryFn: fetchOrganizations,
    enabled: main && canRead,
  });

  const subsidiaries = useMemo(
    () => organizations.filter((o) => o.organizationType === "SUBSIDIARY"),
    [organizations],
  );

  const { data: overview, isLoading } = useQuery({
    queryKey: ["treasury", "overview", year, month, orgScope] as const,
    queryFn: async () => {
      const { data } = await api.get<TreasuryOverviewDto>(
        "/treasury/overview",
        {
          params: {
            year,
            month,
            ...(orgScope !== ALL_ORGS ? { organizationId: orgScope } : {}),
          },
        },
      );
      return data;
    },
    enabled: canRead,
  });

  if (!canRead) {
    return (
      <PageShell>
        <PageHeader
          title="Trésorerie"
          description="Vous n’avez pas accès à la trésorerie caisse."
        />
      </PageShell>
    );
  }

  const s = overview?.summary;

  return (
    <PageShell>
      <PageHeader
        title="Trésorerie"
        description="Encaissements des sessions de caisse clôturées (espèces, carte, mobile money) et écarts de clôture."
        actions={
          canReadClosures ? (
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/clotures">
                <Link2 className="mr-1 size-4" />
                Clôtures de période
              </Link>
            </Button>
          ) : null
        }
      />

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Banknote className="size-4" />
            Période
          </CardTitle>
          <CardDescription>
            Filtrez par mois{main ? " et filiale" : ""}.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div>
            <Label>Année</Label>
            <Select
              value={String(year)}
              onValueChange={(v) => setYear(Number(v))}
            >
              <SelectTrigger className="mt-1 w-28">
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
              <Label>Organisation</Label>
              <Select value={orgScope} onValueChange={setOrgScope}>
                <SelectTrigger className="mt-1 w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_ORGS}>Toutes les filiales</SelectItem>
                  {subsidiaries.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {isLoading || !s ? (
        <p className="mt-6 text-sm text-muted-foreground">Chargement…</p>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Ventes encaissées</CardDescription>
                <CardTitle className="text-xl">
                  {formatFcfa(s.totalVentesFcfa)}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                {s.nombreVentes} vente(s) · {s.nombreSessions} session(s)
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Espèces</CardDescription>
                <CardTitle className="text-xl">
                  {formatFcfa(s.totalEspecesFcfa)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Carte</CardDescription>
                <CardTitle className="text-xl">
                  {formatFcfa(s.totalCarteFcfa)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Mobile money</CardDescription>
                <CardTitle className="text-xl">
                  {formatFcfa(s.totalMobileMoneyFcfa)}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Écarts de clôture (cumul)</CardDescription>
                <CardTitle className="text-xl">
                  {formatFcfa(s.totalEcartClotureFcfa)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Sessions encore ouvertes</CardDescription>
                <CardTitle className="text-xl">
                  {s.sessionsOuvertes}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">
                Sessions clôturées — {MONTHS_FR[month - 1]} {year}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {overview.sessions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucune session clôturée sur cette période.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                        <th className="pb-2 pr-4">Date</th>
                        {main ? (
                          <th className="pb-2 pr-4">Organisation</th>
                        ) : null}
                        <th className="pb-2 pr-4">Ventes</th>
                        <th className="pb-2 pr-4">Espèces</th>
                        <th className="pb-2 pr-4">Carte</th>
                        <th className="pb-2 pr-4">Mobile</th>
                        <th className="pb-2">Écart</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {overview.sessions.map((row) => (
                        <tr key={row.id}>
                          <td className="py-2 pr-4 text-muted-foreground">
                            {row.closedAt
                              ? new Date(row.closedAt).toLocaleString("fr-FR", {
                                  dateStyle: "short",
                                  timeStyle: "short",
                                })
                              : "—"}
                          </td>
                          {main ? (
                            <td className="py-2 pr-4">
                              {row.organization.name}
                            </td>
                          ) : null}
                          <td className="py-2 pr-4">
                            {formatFcfa(row.totalVentesFcfa)}
                          </td>
                          <td className="py-2 pr-4">
                            {formatFcfa(row.totalEspecesFcfa)}
                          </td>
                          <td className="py-2 pr-4">
                            {formatFcfa(row.totalCarteFcfa)}
                          </td>
                          <td className="py-2 pr-4">
                            {formatFcfa(row.totalMobileMoneyFcfa)}
                          </td>
                          <td className="py-2">
                            {row.ecartCloture != null
                              ? formatFcfa(row.ecartCloture)
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </PageShell>
  );
}
