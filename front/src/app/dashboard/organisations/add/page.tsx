"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import AddOrganisationForm from "../_components/AddOrganisationForm";
import {
  dashboardHomePath,
  hasMePermission,
  isMainOrganization,
  useMe,
} from "~/hooks/use-me";

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
      <main className="flex h-full flex-1 items-center justify-center bg-white p-6 text-gray-600">
        Redirection…
      </main>
    );
  }

  return (
    <main className="flex h-full min-h-0 min-w-0 w-full flex-1 flex-col items-center gap-8 overflow-auto bg-white p-6">
      <div className="flex w-full items-center">
        <div className="flex flex-1 justify-start">
          <Link
            href="/dashboard/organisations"
            className="flex w-fit cursor-pointer items-center gap-2 rounded-md p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-orange-500"
          >
            <ArrowLeft className="size-4" />
            Retour
          </Link>
        </div>
        <h1 className="shrink-0 text-center text-4xl font-extrabold text-orange-500">
          Nouvelle filiale
        </h1>
        <div className="flex-1" />
      </div>

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
