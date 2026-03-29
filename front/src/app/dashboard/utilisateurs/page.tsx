import Link from "next/link";
import { SquarePlus } from "lucide-react";

const UtilisateursPage = async () => {
  const users: never[] = [];

  if (users.length === 0) {
    return (
      <main className="flex h-full min-h-0 min-w-0 w-full flex-1 flex-col gap-4 overflow-auto bg-white p-6">
        <div className="flex w-full items-center">
          <div className="flex flex-1 justify-start">
            <Link
              href="/dashboard/utilisateurs/add"
              className="flex w-fit cursor-pointer items-center gap-2 rounded-md bg-gray-100 p-4 transition-all duration-300 hover:bg-gray-200"
            >
              <SquarePlus className="size-4" /> Ajouter un nouvel utilisateur
            </Link>
          </div>
          <h1 className="shrink-0 text-4xl font-extrabold text-orange-500">
            Utilisateurs
          </h1>
          <div className="flex-1" />
        </div>
        <p className="flex flex-1 items-center justify-center text-center text-gray-600">
          Liste des utilisateurs : brancher les endpoints de l&apos;API .NET pour
          afficher les données.
        </p>
      </main>
    );
  }

  return null;
};

export default UtilisateursPage;
