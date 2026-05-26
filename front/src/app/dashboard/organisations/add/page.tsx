"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { DashboardSubpageHeader } from "~/components/layout/dashboard-subpage-header";
import AddOrganisationForm from "../_components/AddOrganisationForm";
import {
  dashboardHomePath,
  hasMePermission,
  isMainOrganization,
  useMe,
} from "~/hooks/use-me";
import { dashboardMainCenteredClass } from "~/lib/dashboard-styles";

const AddOrganizationPage = () => {
  const router = useRouter();
  const { data: me } = useMe();
  const canCreateOrganization =
    me != null && hasMePermission(me, "create", "Organization");

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
        title="Nouvelle filiale"
        backHref="/dashboard/organisations"
      />

      {me != null && !canCreateOrganization ? (
        <div
          className="max-w-lg rounded-xl border border-amber-200 bg-amber-50/80 p-5 text-sm text-amber-950"
          role="alert"
        >
          <p className="font-semibold">Accès refusé</p>
          <p className="mt-2">
            Vous n’avez pas la permission de créer des organisations.
          </p>
          <Link
            href="/dashboard/organisations"
            className="mt-4 inline-block font-medium text-orange-700 underline-offset-2 hover:underline"
          >
            Retour aux organisations
          </Link>
        </div>
      ) : (
        <AddOrganisationForm />
      )}
    </main>
  );
};

export default AddOrganizationPage;
