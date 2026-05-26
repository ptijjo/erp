"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { DashboardSubpageHeader } from "~/components/layout/dashboard-subpage-header";
import { hasMePermission, useMe } from "~/hooks/use-me";
import { dashboardMainCenteredClass } from "~/lib/dashboard-styles";

import EditRoleForm from "../../../_components/EditRoleForm";

export default function EditRolePage() {
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
        title="Modifier le rôle"
        backHref="/dashboard/utilisateurs/roles"
        backLabel="Retour aux rôles"
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
      ) : !hasMePermission(me, "update", "Role") ? (
        <div
          className="max-w-lg rounded-xl border border-amber-200 bg-amber-50/80 p-5 text-sm text-amber-950"
          role="alert"
        >
          <p className="font-semibold">Accès refusé</p>
          <p className="mt-2">
            Seuls l’administrateur, le directeur général et le directeur des
            opérations peuvent modifier les rôles.
          </p>
          <Link
            href="/dashboard/utilisateurs/roles"
            className="mt-4 inline-block font-medium text-orange-700 underline-offset-2 hover:underline"
          >
            Retour à la liste des rôles
          </Link>
        </div>
      ) : id ? (
        <EditRoleForm roleId={id} />
      ) : (
        <p className="text-sm text-red-600">Identifiant de rôle manquant.</p>
      )}
    </main>
  );
}
