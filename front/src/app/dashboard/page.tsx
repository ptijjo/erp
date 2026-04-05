"use client";

import Link from "next/link";
import { Package, ShoppingBag, Wallet } from "lucide-react";

import {
  isMainOrganization,
  subsidiaryOrganizationPath,
  useMe,
} from "~/hooks/use-me";

export default function DashboardPage() {
  const { data: me, isPending } = useMe();

  if (isPending || !me) {
    return (
      <main className="flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-auto bg-white p-6">
        <p className="text-gray-600">Chargement…</p>
      </main>
    );
  }

  const main = isMainOrganization(me);
  const orgHref = subsidiaryOrganizationPath(me);

  return (
    <main className="flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-auto bg-white p-6">
      <h1 className="text-4xl font-extrabold text-orange-500">
        {main ? "Dashboard" : "Accueil"}
      </h1>

      {!main ? (
        <div className="mt-6 max-w-2xl space-y-4 text-gray-800">
          <p className="text-lg text-gray-700">
            Bienvenue — vous êtes connecté pour{" "}
            <span className="font-semibold text-[#2D323E]">
              {me.organisationName}
            </span>
            .
          </p>
          <p className="text-sm text-gray-600">
            Les informations détaillées de votre point de vente (nom, type,
            description…) se trouvent sous{" "}
            <span className="font-medium">Mon organisation</span> dans le menu.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/dashboard/produits"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-100"
            >
              <Package className="size-4 text-orange-600" />
              Produits
            </Link>
            <Link
              href="/dashboard/ventes"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-100"
            >
              <ShoppingBag className="size-4 text-orange-600" />
              Ventes
            </Link>
            <Link
              href="/dashboard/caisse"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-100"
            >
              <Wallet className="size-4 text-orange-600" />
              Caisse
            </Link>
            {orgHref ? (
              <Link
                href={orgHref}
                className="inline-flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm font-semibold text-orange-900 transition-colors hover:bg-orange-100"
              >
                Fiche organisation
              </Link>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="mt-6 text-gray-600">
          Vue d’ensemble — utilisez le menu pour accéder aux modules.
        </p>
      )}
    </main>
  );
}
