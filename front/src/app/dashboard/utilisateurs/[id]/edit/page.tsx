"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";

import EditUserForm from "../../_components/EditUserForm";

export default function EditUserPage() {
  const params = useParams();
  const id =
    typeof params.id === "string"
      ? params.id
      : Array.isArray(params.id)
        ? params.id[0]
        : "";

  return (
    <main className="flex min-h-0 min-w-0 w-full flex-1 flex-col gap-8 overflow-auto bg-white p-6">
      <div className="flex w-full flex-wrap items-center gap-4">
        <div className="flex flex-1 justify-start">
          <Link
            href={id ? `/dashboard/utilisateurs/${id}` : "/dashboard/utilisateurs"}
            className="flex w-fit cursor-pointer items-center gap-2 rounded-md p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-orange-500"
          >
            <ArrowLeft className="size-4" />
            Retour au détail
          </Link>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-xl bg-orange-500/15 text-orange-600">
            <Pencil className="size-7" strokeWidth={1.75} />
          </div>
          <h1 className="text-3xl font-extrabold text-orange-500 sm:text-4xl">
            Modifier l’utilisateur
          </h1>
        </div>
        <div className="hidden flex-1 sm:block" />
      </div>

      {id ? (
        <EditUserForm userId={id} />
      ) : (
        <p className="text-sm text-red-600">Identifiant manquant.</p>
      )}
    </main>
  );
}
