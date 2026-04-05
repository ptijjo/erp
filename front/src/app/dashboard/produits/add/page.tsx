"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import AddProductForm from "../_components/AddProductForm";
import { dashboardHomePath, isMainOrganization, useMe } from "~/hooks/use-me";

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
      <main className="flex flex-1 items-center justify-center bg-white p-6 text-gray-600">
        Redirection…
      </main>
    );
  }

  return (
    <main className="flex h-full min-h-0 min-w-0 w-full flex-1 flex-col items-center gap-8 overflow-auto bg-white p-6">
      <div className="flex w-full items-center">
        <div className="flex flex-1 justify-start">
          <Link
            href="/dashboard/produits"
            className="flex w-fit cursor-pointer items-center gap-2 rounded-md p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-orange-500"
          >
            <ArrowLeft className="size-4" />
            Retour
          </Link>
        </div>
        <h1 className="shrink-0 text-4xl font-extrabold text-orange-500">
          Nouveau produit
        </h1>
        <div className="flex-1" />
      </div>

      <AddProductForm />
    </main>
  );
}
