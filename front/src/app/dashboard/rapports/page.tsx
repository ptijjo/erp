"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { GroupAnalyticsDashboard } from "~/app/dashboard/_components/GroupAnalyticsDashboard";
import { hasAnalyticsAccess } from "~/lib/dashboard-navigation";
import { PageHeader } from "~/components/layout/page-header";
import { PageShell } from "~/components/layout/page-shell";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { isMainOrganization, useMe } from "~/hooks/use-me";
import { api } from "~/lib/api";
import { fetchOrganizations } from "~/lib/api-list";
import type { OrganizationDto } from "~/lib/api-types";

const ALL_SUBSIDIARIES = "all";

export default function RapportsPage() {
  const { data: me, isPending } = useMe();
  const main = me != null && isMainOrganization(me);
  const canAccess = me != null && hasAnalyticsAccess(me);
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [subsidiaryFilter, setSubsidiaryFilter] = useState(ALL_SUBSIDIARIES);

  const { data: organizations = [] } = useQuery({
    queryKey: ["organisation"] as const,
    queryFn: fetchOrganizations,
    enabled: Boolean(main && canAccess),
  });

  const subsidiaries = useMemo(
    () =>
      organizations.filter((o) => o.organizationType === "SUBSIDIARY"),
    [organizations],
  );

  const subsidiaryId =
    subsidiaryFilter !== ALL_SUBSIDIARIES ? subsidiaryFilter : undefined;

  const yearOptions = useMemo(() => {
    return [currentYear, currentYear - 1, currentYear - 2];
  }, [currentYear]);

  if (isPending || !me) {
    return (
      <PageShell>
        <p className="text-sm text-muted-foreground">Chargement…</p>
      </PageShell>
    );
  }

  if (!canAccess) {
    return (
      <PageShell>
        <PageHeader
          title="Rapports & analyses"
          description="Vous n’avez pas les droits pour consulter les synthèses."
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Rapports & analyses"
        description={
          main
            ? "Vue consolidée VIFAA : budgets, dépenses, RH, stocks et commandes."
            : `Synthèse pour ${me.organisationName}.`
        }
      />

      <div className="mt-6 flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="report-year">Année</Label>
          <Select
            value={String(year)}
            onValueChange={(v) => setYear(Number(v))}
          >
            <SelectTrigger id="report-year" className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {main && subsidiaries.length > 0 ? (
          <div className="space-y-1.5">
            <Label htmlFor="report-subsidiary">Filiale</Label>
            <Select
              value={subsidiaryFilter}
              onValueChange={setSubsidiaryFilter}
            >
              <SelectTrigger id="report-subsidiary" className="w-[220px]">
                <SelectValue placeholder="Toutes les filiales" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_SUBSIDIARIES}>
                  Toutes les filiales
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
      </div>

      <section className="mt-8">
        <GroupAnalyticsDashboard
          variant="full"
          year={year}
          subsidiaryOrganizationId={subsidiaryId}
        />
      </section>
    </PageShell>
  );
}
