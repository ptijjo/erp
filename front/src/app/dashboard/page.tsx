"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { PageShell } from "~/components/layout/page-shell";
import { erpHomeForOrganizationType } from "~/lib/erp-paths";
import { useMe } from "~/hooks/use-me";

/** Point d’entrée `/dashboard` → accueil HQ ou filiale selon le profil. */
export default function DashboardIndexRedirect() {
  const router = useRouter();
  const { data: me, isPending } = useMe();

  useEffect(() => {
    if (isPending || !me) return;
    router.replace(erpHomeForOrganizationType(me.organizationType));
  }, [me, isPending, router]);

  return (
    <PageShell>
      <p className="text-sm text-muted-foreground">Redirection…</p>
    </PageShell>
  );
}
