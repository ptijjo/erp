"use client";

import Link from "next/link";
import { Building2, Package } from "lucide-react";

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
import { filterModuleTiles } from "~/lib/dashboard-navigation";
import {
  isMainOrganization,
  subsidiaryOrganizationPath,
  useMe,
} from "~/hooks/use-me";

export default function DashboardPage() {
  const { data: me, isPending } = useMe();

  if (isPending || !me) {
    return (
      <PageShell>
        <p className="text-sm text-muted-foreground">Chargement…</p>
      </PageShell>
    );
  }

  const main = isMainOrganization(me);
  const orgHref = subsidiaryOrganizationPath(me);
  const modules = filterModuleTiles(me);

  return (
    <PageShell>
      <PageHeader
        title={main ? "Tableau de bord" : "Accueil"}
        description={
          main ? (
            <>
              Vue d’ensemble du groupe{" "}
              <span className="font-medium text-foreground">VIFAA</span> — accédez
              aux modules selon vos droits.
            </>
          ) : (
            <>
              Espace dédié à{" "}
              <span className="font-medium text-foreground">
                {me.organisationName}
              </span>
              .
            </>
          )
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

      <section className="mt-8 space-y-8">
        {main ? (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {modules.map((tile) => (
                <ModuleTile key={tile.href} {...tile} />
              ))}
            </section>
            {modules.length === 0 ? (
              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle className="text-base">
                    Aucun module accessible
                  </CardTitle>
                  <CardDescription>
                    Votre rôle ne permet pas encore d’accéder aux espaces métier.
                    Contactez un administrateur.
                  </CardDescription>
                </CardHeader>
              </Card>
            ) : null}
          </>
        ) : (
          <section className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Démarrage rapide</CardTitle>
                <CardDescription>
                  Consultez le catalogue et la fiche de votre point de vente.
                </CardDescription>
              </CardHeader>
              <section className="flex flex-wrap gap-2 px-6 pb-6">
                <Button variant="default" size="sm" asChild>
                  <Link href="/dashboard/produits">
                    <Package className="size-4" />
                    Produits
                  </Link>
                </Button>
                {orgHref ? (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={orgHref}>
                      <Building2 className="size-4" />
                      Fiche organisation
                    </Link>
                  </Button>
                ) : null}
              </section>
            </Card>
            <Card className="bg-muted/40">
              <CardHeader>
                <CardTitle className="text-base">Besoin d’aide ?</CardTitle>
                <CardDescription>
                  Les alertes stocks et budgets apparaîtront ici lorsque les
                  données seront disponibles pour votre filiale.
                </CardDescription>
              </CardHeader>
            </Card>
          </section>
        )}
      </section>
    </PageShell>
  );
}
