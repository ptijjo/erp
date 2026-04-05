import { ArrowLeft, ShieldPlus } from "lucide-react";
import Link from "next/link";

import AddRoleForm from "../../_components/AddRoleForm";

export default function AddRolePage() {
  return (
    <main className="flex min-h-0 min-w-0 w-full flex-1 flex-col gap-8 overflow-auto bg-white p-6">
      <div className="flex w-full flex-wrap items-center gap-4">
        <div className="flex flex-1 justify-start">
          <Link
            href="/dashboard/utilisateurs"
            className="flex w-fit cursor-pointer items-center gap-2 rounded-md p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-orange-500"
          >
            <ArrowLeft className="size-4" />
            Retour
          </Link>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-xl bg-orange-500/15 text-orange-600">
            <ShieldPlus className="size-7" strokeWidth={1.75} />
          </div>
          <h1 className="text-3xl font-extrabold text-orange-500 sm:text-4xl">
            Nouveau rôle
          </h1>
        </div>
        <div className="hidden flex-1 sm:block" />
      </div>

      <AddRoleForm />
    </main>
  );
}
