import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import AddUserForm from "../_components/AddUserForm";

export default function AddUserPage() {
  return (
    <main className="flex min-h-0 min-w-0 w-full flex-1 flex-col gap-8 overflow-auto bg-white p-6">
      <div className="flex w-full items-center">
        <div className="flex flex-1 justify-start">
          <Link
            href="/dashboard/utilisateurs"
            className="flex w-fit cursor-pointer items-center gap-2 rounded-md p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-orange-500"
          >
            <ArrowLeft className="size-4" />
            Retour
          </Link>
        </div>
        <h1 className="shrink-0 text-4xl font-extrabold text-orange-500">
          Ajouter un utilisateur
        </h1>
        <div className="flex-1" />
      </div>

      <AddUserForm />
    </main>
  );
}