 "use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { hasMePermission, useMe } from "~/hooks/use-me";
import EditCategoryForm from "../../produits/_components/EditCategoryForm";

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
    <main className="flex h-full min-h-0 min-w-0 w-full flex-1 flex-col items-center gap-8 overflow-auto bg-white p-6">
      <div className="flex w-full items-center">
        <div className="flex flex-1 justify-start">
          <Link
            href="/dashboard/categories"
            className="flex w-fit cursor-pointer items-center gap-2 rounded-md p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-orange-500"
          >
            <ArrowLeft className="size-4" />
            Retour
          </Link>
        </div>
        <h1 className="shrink-0 text-4xl font-extrabold text-orange-500">
          Modifier la catégorie
        </h1>
        <div className="flex-1" />
      </div>

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
            href="/dashboard/categories"
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
