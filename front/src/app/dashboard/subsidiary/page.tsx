"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Building2, History, ScanLine } from "lucide-react";

import { DashboardAlertBanner } from "~/app/dashboard/_components/DashboardAlertBanner";
import { GroupAnalyticsDashboard } from "~/app/dashboard/_components/GroupAnalyticsDashboard";
import { ModuleTile } from "~/components/layout/module-tile";
import { PageHeader } from "~/components/layout/page-header";
import { PageShell } from "~/components/layout/page-shell";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  canOperateCaisse,
  canReadSessionCaisseHistory,
  canSeeCaisseNav,
  filterSubsidiaryModuleTiles,
  hasAnalyticsAccess,
} from "~/lib/dashboard-navigation";
import { ERP_PATHS } from "~/lib/erp-paths";
import {
  isMainOrganization,
  subsidiaryOrganizationPath,
  useMe,
} from "~/hooks/use-me";

/** Accueil filiale — opérations locales + alertes. */
export default function SubsidiaryHomePage() {
  const router = useRouter();
  const { data: me, isPending } = useMe();

  useEffect(() => {
    if (isPending || !me) return;
    if (isMainOrganization(me)) {
      router.replace(ERP_PATHS.hqHome);
    }
  }, [me, isPending, router]);

  if (isPending || !me || isMainOrganization(me)) {
    return (
      <PageShell>
        <p className="text-sm text-muted-foreground">Chargement…</p>
      </PageShell>
    );
  }

  const orgHref = subsidiaryOrganizationPath(me);
  const modules = filterSubsidiaryModuleTiles(me);
  const showAnalytics = hasAnalyticsAccess(me);
  const canUseCaisse = canOperateCaisse(me);
  const canViewCaisse = canSeeCaisseNav(me);
  const canViewSessions = canReadSessionCaisseHistory(me);

  return (
    <PageShell>
      <PageHeader
        title="Filiale"
        description={
          <>
            Espace dédié à{" "}
            <span className="font-medium text-foreground">
              {me.organisationName}
            </span>
          </>
        }
        actions={
          orgHref ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={orgHref}>
                <Building2 className="size-4" />
                Mon organisation
              </Link>
            </Button>
          ) : undefined
        }
      />
      <div className="mt-6">
        <DashboardAlertBanner />
      </div>
      <section className="mt-8 space-y-6">
        {showAnalytics ? (
          <GroupAnalyticsDashboard variant="compact" />
        ) : null}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {modules.map((tile) => (
            <ModuleTile key={tile.href} {...tile} />
          ))}
        </section>
        {modules.length === 0 ? (
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-base">Aucun module accessible</CardTitle>
              <CardDescription>
                Contactez un administrateur pour obtenir des droits.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : null}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Raccourcis filiale</CardTitle>
            <CardDescription>
              Caisse et historique de vos sessions.
            </CardDescription>
          </CardHeader>
          <section className="flex flex-wrap gap-2 px-6 pb-6">
            {canViewCaisse ? (
              <Button variant="default" size="sm" asChild>
                <Link href={ERP_PATHS.caisse}>
                  <ScanLine className="size-4" />
                  {canUseCaisse ? "Caisse" : "Caisse (consultation)"}
                </Link>
              </Button>
            ) : null}
            {canViewSessions ? (
              <Button variant="outline" size="sm" asChild>
                <Link href={ERP_PATHS.compte}>
                  <History className="size-4" />
                  Mes sessions caisse
                </Link>
              </Button>
            ) : null}
          </section>
        </Card>
      </section>
    </PageShell>
  );
}
