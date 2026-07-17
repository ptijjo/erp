"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardSubpageHeader } from "~/components/layout/dashboard-subpage-header";
import { api } from "~/lib/api";
import { fetchOrganizations } from "~/lib/api-list";
import type { OrganizationDto } from "~/lib/api-types";
import {
  dashboardHomePath,
  hasMePermission,
  isMainOrganization,
  useMe,
} from "~/hooks/use-me";
import { dashboardMainCenteredClass } from "~/lib/dashboard-styles";

import OrganisationCatalogPanel from "../_components/OrganisationCatalogPanel";
import { OrganisationDetailOverview } from "../_components/OrganisationDetailOverview";

export default function OrganisationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { data: me } = useMe();
  const slug =
    typeof params.slug === "string"
      ? params.slug
      : Array.isArray(params.slug)
        ? params.slug[0]
        : "";

  useEffect(() => {
    if (!me || isMainOrganization(me)) return;
    if (me.organizationSlug && slug !== me.organizationSlug) {
      router.replace(dashboardHomePath(me));
    }
  }, [me, router, slug]);

  const { data: organizations = [], isLoading, isError } = useQuery({
    queryKey: ["organisation"] as const,
    queryFn: fetchOrganizations,
  });

  const org = organizations.find((o) => o.slug === slug);

  const showBackToOrgList = me && isMainOrganization(me);
  const canUpdateOrganization =
    me != null && hasMePermission(me, "update", "Organization");

  return (
    <main className={dashboardMainCenteredClass}>
      <DashboardSubpageHeader
        title={
          org?.name ??
          (me && !isMainOrganization(me) ? "Mon organisation" : "Organisation")
        }
        backHref={showBackToOrgList ? "/dashboard/hq/organisations" : "/dashboard"}
        backLabel={showBackToOrgList ? "Retour" : "Tableau de bord"}
      />

      {isError && (
        <p className="mt-6 text-red-600">Impossible de charger l’organisation.</p>
      )}

      {isLoading ? (
        <p className="mt-8 text-gray-600">Chargement…</p>
      ) : !org ? (
        <p className="mt-8 text-gray-600">
          Aucune organisation avec le slug <code className="font-mono">{slug}</code>.
        </p>
      ) : (
        <div className="mt-8 flex w-full max-w-3xl flex-col gap-6">
          <OrganisationDetailOverview
            org={org}
            canEdit={Boolean(
              canUpdateOrganization && me && isMainOrganization(me),
            )}
          />

          {me && isMainOrganization(me) && org.organizationType === "SUBSIDIARY" ? (
            <OrganisationCatalogPanel
              organizationId={org.id}
              organizationName={org.name}
              canEditCatalog={canUpdateOrganization}
            />
          ) : null}
        </div>
      )}
    </main>
  );
}
