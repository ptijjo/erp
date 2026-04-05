"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import AddOrganisationForm from "../_components/AddOrganisationForm";
import { dashboardHomePath, isMainOrganization, useMe } from "~/hooks/use-me";

const AddOrganizationPage = () => {
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

      <AddOrganisationForm />
    </main>
  );
};

export default AddOrganizationPage;
