"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

import EditPoleForm from "../../../_components/EditPoleForm";
import { DashboardSubpageHeader } from "~/components/layout/dashboard-subpage-header";
import {
  dashboardHomePath,
  hasMePermission,
  isMainOrganization,
  useMe,
} from "~/hooks/use-me";
import { dashboardMainCenteredClass } from "~/lib/dashboard-styles";

export default function EditPolePage() {
  const params = useParams<{ id: string }>();
  const poleId = typeof params.id === "string" ? params.id : "";
  const router = useRouter();
  const { data: me, isPending } = useMe();
  const canUpdate =
    me != null &&
    isMainOrganization(me) &&
    hasMePermission(me, "update", "Pole");

  useEffect(() => {
    if (isPending || !me) return;
    if (!canUpdate) {
      router.replace(dashboardHomePath(me));
    }
  }, [me, isPending, canUpdate, router]);

  if (isPending || !me || !canUpdate || !poleId) {
    return (
      <main className="flex flex-1 items-center justify-center p-6 text-sm text-gray-600">
        Chargement…
      </main>
    );
  }

  return (
    <main className={dashboardMainCenteredClass}>
      <DashboardSubpageHeader
        title="Modifier le pôle"
        backHref="/dashboard/utilisateurs"
        backLabel="Utilisateurs"
      />
      <p className="mb-4 max-w-lg text-center text-sm text-gray-600">
        Mettez à jour le libellé ou la description du pôle.
      </p>
      <EditPoleForm poleId={poleId} />
    </main>
  );
}
