"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { DashboardAlertBanner } from "~/app/dashboard/_components/DashboardAlertBanner";
import { HqOverviewDashboard } from "~/app/dashboard/_components/HqOverviewDashboard";
import { ModuleTile } from "~/components/layout/module-tile";
import { PageHeader } from "~/components/layout/page-header";
import { PageShell } from "~/components/layout/page-shell";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { filterModuleTiles } from "~/lib/dashboard-navigation";
import { ERP_PATHS } from "~/lib/erp-paths";
import { isMainOrganization, useMe } from "~/hooks/use-me";

/** Accueil maison mère — KPIs consolidés + accès rapide. */
export default function HqHomePage() {
  const router = useRouter();
  const { data: me, isPending } = useMe();

  useEffect(() => {
    if (isPending || !me) return;
    if (!isMainOrganization(me)) {
      router.replace(ERP_PATHS.subsidiaryHome);
    }
  }, [me, isPending, router]);

  if (isPending || !me || !isMainOrganization(me)) {
    return (
      <PageShell>
        <p className="text-sm text-muted-foreground">Chargement…</p>
      </PageShell>
    );
  }

  const modules = filterModuleTiles(me);
  const poleLabel = me.role.poleCode
    ? me.role.poleCode.replace(/^Pole_/, "").replace(/_/g, " ")
    : null;

  return (
    <PageShell>
      <PageHeader
        title="Maison mère"
        description={
          <>
            Vue holding VIFAA
            {poleLabel ? (
              <>
                {" · "}
                <span className="text-muted-foreground">Pôle {poleLabel}</span>
              </>
            ) : null}
          </>
        }
      />
      <div className="mt-6">
        <DashboardAlertBanner />
      </div>
      <section className="mt-8 space-y-8">
        <HqOverviewDashboard />
        {modules.length > 0 ? (
          <section>
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Accès rapide</h2>
              <p className="text-sm text-muted-foreground">
                Modules selon vos permissions
                {me.role.name.startsWith("DIRECTOR_")
                  ? " — pôle prioritaire en tête"
                  : ""}
                .
              </p>
            </div>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {modules.map((tile) => (
                <ModuleTile key={tile.href} {...tile} />
              ))}
            </section>
          </section>
        ) : (
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-base">Aucun module accessible</CardTitle>
              <CardDescription>
                Contactez un administrateur pour obtenir des droits.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </section>
    </PageShell>
  );
}
