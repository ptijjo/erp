"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { DashboardSubpageHeader } from "~/components/layout/dashboard-subpage-header";
import AddProductForm from "../_components/AddProductForm";
import { dashboardHomePath, isMainOrganization, useMe } from "~/hooks/use-me";
import { dashboardMainCenteredClass } from "~/lib/dashboard-styles";

export default function AddProductPage() {
  const router = useRouter();
  const { data: me } = useMe();
  const allowed = me != null && isMainOrganization(me);

  useEffect(() => {
    if (me != null && !allowed) {
      router.replace(dashboardHomePath(me));
    }
  }, [me, allowed, router]);

  if (me != null && !allowed) {
    return (
      <main className="flex flex-1 items-center justify-center bg-white p-4 sm:p-6 text-gray-600">
        Redirection…
      </main>
    );
  }

  return (
    <main className={dashboardMainCenteredClass}>
      <DashboardSubpageHeader
        title="Nouveau produit"
        backHref="/dashboard/produits"
      />
      <AddProductForm />
    </main>
  );
}
