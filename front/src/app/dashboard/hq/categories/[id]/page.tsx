"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { DashboardSubpageHeader } from "~/components/layout/dashboard-subpage-header";
import { hasMePermission, useMe } from "~/hooks/use-me";
import { dashboardMainCenteredClass } from "~/lib/dashboard-styles";

import EditCategoryForm from "../../../produits/_components/EditCategoryForm";

export default function EditCategoryPage() {
  const { data: me, isPending: mePending } = useMe();
  const canUpdateCategory =
    me != null && hasMePermission(me, "update", "Category");
  const canDeleteCategory =
    me != null && hasMePermission(me, "delete", "Category");
  const params = useParams();
  const id =
    typeof params.id === "string"
      ? params.id
      : Array.isArray(params.id)
        ? params.id[0]
        : "";

  return (
    <main className={dashboardMainCenteredClass}>
      <DashboardSubpageHeader
        title="Modifier la catégorie"
        backHref="/dashboard/hq/categories"
      />

      {mePending ? (
        <p className="text-sm text-gray-600">Vérification des droits…</p>
      ) : me == null ? (
        <div className="max-w-lg rounded-xl border border-gray-200 bg-gray-50 p-5 text-sm text-gray-800">
          <p className="font-semibold">Session non disponible</p>
          <Link
            href="/"
            className="mt-3 inline-block font-medium text-orange-600 underline-offset-2 hover:underline"
          >
            Se connecter
          </Link>
        </div>
      ) : !canUpdateCategory && !canDeleteCategory ? (
        <div
          className="max-w-lg rounded-xl border border-amber-200 bg-amber-50/80 p-5 text-sm text-amber-950"
          role="alert"
        >
          <p className="font-semibold">Accès refusé</p>
          <p className="mt-2">
            Vous n’avez pas la permission de modifier ou supprimer les
            catégories.
          </p>
          <Link
            href="/dashboard/hq/categories"
            className="mt-4 inline-block font-medium text-orange-700 underline-offset-2 hover:underline"
          >
            Retour aux catégories
          </Link>
        </div>
      ) : id ? (
        <EditCategoryForm categoryId={id} />
      ) : (
        <p className="text-sm text-red-600">Identifiant manquant.</p>
      )}
    </main>
  );
}
