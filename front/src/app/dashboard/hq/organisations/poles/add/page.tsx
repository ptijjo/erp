"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { DashboardSubpageHeader } from "~/components/layout/dashboard-subpage-header";
import AddPoleForm from "../../_components/AddPoleForm";
import {
  dashboardHomePath,
  hasMePermission,
  isMainOrganization,
  useMe,
} from "~/hooks/use-me";
import { dashboardMainCenteredClass } from "~/lib/dashboard-styles";

export default function AddPolePage() {
  const router = useRouter();
  const { data: me, isPending } = useMe();
  const canCreate =
    me != null &&
    isMainOrganization(me) &&
    hasMePermission(me, "create", "Pole");

  useEffect(() => {
    if (isPending || !me) return;
    if (!canCreate) {
      router.replace(dashboardHomePath(me));
    }
  }, [me, isPending, canCreate, router]);

  if (isPending || !me || !canCreate) {
    return (
      <main className="flex h-full flex-1 items-center justify-center bg-white p-4 sm:p-6 text-gray-600">
        Chargement…
      </main>
    );
  }

  return (
    <main className={dashboardMainCenteredClass}>
      <DashboardSubpageHeader
        title="Nouveau pôle"
        backHref="/dashboard/hq/organisations"
      />

      <p className="max-w-lg text-center text-sm text-gray-600">
        Les pôles structurent la maison mère (opérations, finances, etc.). Après
        création, vous pourrez rattacher des rôles à ce pôle depuis la gestion
        des rôles.
      </p>

      <AddPoleForm />
    </main>
  );
}
