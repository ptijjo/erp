"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  SubsidiaryCard,
  type SubsidiaryCardData,
} from "~/app/dashboard/_components/SubsidiaryCard";
import { Skeleton } from "~/components/ui/skeleton";
import { api } from "~/lib/api";
import type { GroupAnalyticsOverviewDto, OrganizationDto } from "~/lib/api-types";

type OrganisationsGridViewProps = {
  organizations: OrganizationDto[];
  isLoading?: boolean;
};

function mergeSubsidiaryCards(
  organizations: OrganizationDto[],
  overview: GroupAnalyticsOverviewDto | undefined,
): SubsidiaryCardData[] {
  const subsidiaries = organizations.filter(
    (org) => org.organizationType === "SUBSIDIARY",
  );
  const financialById = new Map(
    overview?.financial?.bySubsidiary.map((row) => [row.organizationId, row]) ??
      [],
  );
  const hrById = new Map(
    overview?.hr?.bySubsidiary.map((row) => [row.organizationId, row]) ?? [],
  );

  return subsidiaries.map((org) => {
    const financial = financialById.get(org.id);
    const hr = hrById.get(org.id);
    return {
      organizationId: org.id,
      name: org.name,
      slug: org.slug,
      description: org.description,
      revenueFcfa: financial?.revenueFcfa,
      employeesActive: hr?.employeesActive,
      utilizationPercent: financial?.utilizationPercent,
      overBudget: financial?.overBudget,
      atRisk: financial?.atRisk,
    };
  });
}

export function OrganisationsGridView({
  organizations,
  isLoading = false,
}: OrganisationsGridViewProps) {
  const year = new Date().getFullYear();

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ["analytics", "overview", year, "all"] as const,
    queryFn: async () => {
      const { data } = await api.get<GroupAnalyticsOverviewDto>(
        "/analytics/overview",
        { params: { year } },
      );
      return data;
    },
  });

  const cards = useMemo(
    () => mergeSubsidiaryCards(organizations, overview),
    [organizations, overview],
  );

  if (isLoading || overviewLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-64 rounded-xl" />
        ))}
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
        Aucune filiale enregistrée pour le moment.
      </p>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {cards.map((subsidiary) => (
        <SubsidiaryCard key={subsidiary.organizationId} subsidiary={subsidiary} />
      ))}
    </div>
  );
}
