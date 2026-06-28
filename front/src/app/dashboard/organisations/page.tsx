"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layers, SquarePlus } from "lucide-react";

import { OrganisationsGridView } from "~/app/dashboard/organisations/_components/OrganisationsGridView";
import { PageHeader } from "~/components/layout/page-header";
import { PageShell } from "~/components/layout/page-shell";
import { Button } from "~/components/ui/button";
import { api } from "~/lib/api";
import type { OrganizationDto } from "~/lib/api-types";
import {
  dashboardHomePath,
  hasMePermission,
  isMainOrganization,
  useMe,
} from "~/hooks/use-me";

export default function OrganisationsPage() {
  const router = useRouter();
  const { data: me } = useMe();
  const canReadOrganization =
    me != null && hasMePermission(me, "read", "Organization");
  const canCreateOrganization =
    me != null && hasMePermission(me, "create", "Organization");
  const canCreatePole =
    me != null && hasMePermission(me, "create", "Pole");

  useEffect(() => {
    if (!me) return;
    if (!isMainOrganization(me) && me.organizationSlug) {
      router.replace(dashboardHomePath(me));
    }
  }, [me, router]);

  const { data: organizations = [], isLoading, isError } = useQuery({
    queryKey: ["organisation"] as const,
    queryFn: async () => {
      const { data } = await api.get<OrganizationDto[]>("/organisation");
      return data;
    },
  });

  if (me && !isMainOrganization(me)) {
    return (
      <PageShell>
        <p className="text-sm text-muted-foreground">Redirection…</p>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Filiales"
        description="Gérez vos filiales et suivez leur performance."
        actions={
          <>
            {canCreateOrganization ? (
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/organisations/add">
                  <SquarePlus className="size-4" />
                  Nouvelle filiale
                </Link>
              </Button>
            ) : null}
            {canCreatePole ? (
              <Button size="sm" asChild>
                <Link href="/dashboard/organisations/poles/add">
                  <Layers className="size-4" />
                  Nouveau pôle
                </Link>
              </Button>
            ) : null}
          </>
        }
      />

      {!canReadOrganization ? (
        <div
          className="mt-6 max-w-lg rounded-xl border border-amber-200 bg-amber-50/80 p-5 text-sm text-amber-950"
          role="alert"
        >
          <p className="font-semibold">Accès refusé</p>
          <p className="mt-2">
            Vous n’avez pas la permission de consulter les organisations.
          </p>
        </div>
      ) : null}

      {canReadOrganization && isError ? (
        <p className="mt-6 text-sm text-destructive">
          Impossible de charger les organisations.
        </p>
      ) : null}

      {canReadOrganization && !isError ? (
        <div className="mt-6">
          <OrganisationsGridView
            organizations={organizations}
            isLoading={isLoading}
          />
        </div>
      ) : null}
    </PageShell>
  );
}
