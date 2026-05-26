"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { DashboardSubpageHeader } from "~/components/layout/dashboard-subpage-header";
import AddPoleForm from "../../_components/AddPoleForm";
import {
  dashboardHomePath,
  isMainOrganization,
  useMe,
} from "~/hooks/use-me";
import { dashboardMainCenteredClass } from "~/lib/dashboard-styles";

export default function AddPolePage() {
  const router = useRouter();
  const { data: me } = useMe();

  useEffect(() => {
    if (!me) return;
    if (!isMainOrganization(me)) {
      router.replace(dashboardHomePath(me));
    }
  }, [me, router]);

  if (me && !isMainOrganization(me)) {
    return (
      <main className="flex h-full flex-1 items-center justify-center bg-white p-4 sm:p-6 text-gray-600">
        Redirection…
      </main>
    );
  }

  return (
    <main className={dashboardMainCenteredClass}>
      <DashboardSubpageHeader
        title="Nouveau pôle"
        backHref="/dashboard/organisations"
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
