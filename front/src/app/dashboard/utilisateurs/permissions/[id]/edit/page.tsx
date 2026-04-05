"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";

import { useMe } from "~/hooks/use-me";

import EditPermissionForm from "../../../_components/EditPermissionForm";
import { isFullAccessRole } from "../../../_lib/full-access-roles";

export default function EditPermissionPage() {
  const { data: me, isPending: mePending } = useMe();
  const params = useParams();
  const id =
    typeof params.id === "string"
      ? params.id
      : Array.isArray(params.id)
        ? params.id[0]
        : "";

  return (
    <main className="flex min-h-0 min-w-0 w-full flex-1 flex-col gap-8 overflow-auto bg-white p-6">
      <div className="flex w-full flex-wrap items-center gap-4">
        <div className="flex flex-1 justify-start">
          <Link
            href="/dashboard/utilisateurs/permissions"
            className="flex w-fit cursor-pointer items-center gap-2 rounded-md p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-orange-500"
          >
            <ArrowLeft className="size-4" />
            Retour au catalogue
          </Link>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-xl bg-orange-500/15 text-orange-600">
            <Pencil className="size-7" strokeWidth={1.75} />
          </div>
          <h1 className="text-3xl font-extrabold text-orange-500 sm:text-4xl">
            Modifier la permission
          </h1>
        </div>
        <div className="hidden flex-1 sm:block" />
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
      ) : !isFullAccessRole(me.role.name) ? (
        <div
          className="max-w-lg rounded-xl border border-amber-200 bg-amber-50/80 p-5 text-sm text-amber-950"
          role="alert"
        >
          <p className="font-semibold">Accès refusé</p>
          <p className="mt-2">
            Seuls l’administrateur, le directeur général et le directeur des
            opérations peuvent modifier les permissions.
          </p>
          <Link
            href="/dashboard/utilisateurs/permissions"
            className="mt-4 inline-block font-medium text-orange-700 underline-offset-2 hover:underline"
          >
            Retour au catalogue
          </Link>
        </div>
      ) : id ? (
        <EditPermissionForm permissionId={id} />
      ) : (
        <p className="text-sm text-red-600">Identifiant manquant.</p>
      )}
    </main>
  );
}
