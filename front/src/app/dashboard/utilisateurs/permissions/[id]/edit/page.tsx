"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { DashboardSubpageHeader } from "~/components/layout/dashboard-subpage-header";
import { isAdminUser, useMe } from "~/hooks/use-me";
import { dashboardMainCenteredClass } from "~/lib/dashboard-styles";

import EditPermissionForm from "../../../_components/EditPermissionForm";

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
    <main className={dashboardMainCenteredClass}>
      <DashboardSubpageHeader
        title="Modifier la permission"
        backHref="/dashboard/utilisateurs/permissions"
        backLabel="Retour au catalogue"
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
      ) : !isAdminUser(me) ? (
        <div
          className="max-w-lg rounded-xl border border-amber-200 bg-amber-50/80 p-5 text-sm text-amber-950"
          role="alert"
        >
          <p className="font-semibold">Accès refusé</p>
          <p className="mt-2">
            La modification du catalogue des permissions est réservée au compte
            administrateur (rôle ADMIN).
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
