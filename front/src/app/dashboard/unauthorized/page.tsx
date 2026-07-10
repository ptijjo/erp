"use client";

import Link from "next/link";
import { ShieldAlert } from "lucide-react";

import { PageHeader } from "~/components/layout/page-header";
import { PageShell } from "~/components/layout/page-shell";
import { Button } from "~/components/ui/button";
import { dashboardHomePath, useMe } from "~/hooks/use-me";

export default function UnauthorizedPage() {
  const { data: me } = useMe();
  const homeHref = me ? dashboardHomePath(me) : "/dashboard";

  return (
    <PageShell>
      <PageHeader
        title="Accès refusé"
        description="Vous n'avez pas les permissions nécessaires pour consulter cette page."
      />
      <div className="mt-8 flex flex-col items-center gap-4 text-center">
        <ShieldAlert className="size-12 text-muted-foreground" aria-hidden />
        <p className="max-w-md text-sm text-muted-foreground">
          Si vous pensez qu'il s'agit d'une erreur, contactez un administrateur
          pour vérifier votre rôle et vos permissions.
        </p>
        <Button asChild>
          <Link href={homeHref}>Retour au tableau de bord</Link>
        </Button>
      </div>
    </PageShell>
  );
}
