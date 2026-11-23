"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { DashboardAlertBanner } from "~/app/dashboard/_components/DashboardAlertBanner";
import { HqOverviewDashboard } from "~/app/dashboard/_components/HqOverviewDashboard";
import { PageHeader } from "~/components/layout/page-header";
import { PageShell } from "~/components/layout/page-shell";
import { ERP_PATHS } from "~/lib/erp-paths";
import { isMainOrganization, useMe } from "~/hooks/use-me";

/** Accueil maison mère — graphes et synthèse, filtrables par filiale. */
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

  return (
    <PageShell>
      <PageHeader title="Tableau de bord" />
      <div className="mt-6">
        <DashboardAlertBanner />
      </div>
      <section className="mt-6">
        <HqOverviewDashboard />
      </section>
    </PageShell>
  );
}
