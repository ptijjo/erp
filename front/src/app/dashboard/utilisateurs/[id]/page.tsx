import { ArrowLeft } from "lucide-react";
import Link from "next/link";

const UserPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;

  return (
    <main className="flex h-full min-h-0 min-w-0 w-full flex-1 flex-col overflow-auto bg-white p-6">
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
          Utilisateur
        </h1>
        <div className="flex-1" />
      </div>
      <p className="mt-8 text-gray-600">
        Détail utilisateur (id : <code className="font-mono">{id}</code>) — à
        relier à l&apos;API .NET.
      </p>
    </main>
  );
};

export default UserPage;
