"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { KeyRound, ListChecks, Plus, ShieldPlus, SquarePlus } from "lucide-react";

import { useMe } from "~/hooks/use-me";
import { api } from "~/lib/api";
import type { UserListItemDto } from "~/lib/api-types";

import { isFullAccessRole } from "./_lib/full-access-roles";

export default function UtilisateursPage() {
  const { data: me } = useMe();
  const canManagePermissions =
    me != null && isFullAccessRole(me.role.name);
  const { data: users = [], isLoading, isError } = useQuery({
    queryKey: ["user"] as const,
    queryFn: async () => {
      const { data } = await api.get<UserListItemDto[]>("/user");
      return data;
    },
  });

  return (
    <main className="flex h-full min-h-0 min-w-0 w-full flex-1 flex-col gap-4 overflow-auto bg-white p-6">
      <div className="flex w-full items-center">
        <div className="flex flex-1 flex-wrap justify-start gap-3">
          <Link
            href="/dashboard/utilisateurs/add"
            className="flex w-fit cursor-pointer items-center gap-2 rounded-md bg-gray-100 p-4 transition-all duration-300 hover:bg-gray-200"
          >
            <SquarePlus className="size-4" /> Ajouter un utilisateur
          </Link>
          {canManagePermissions && (
            <>
              <Link
                href="/dashboard/utilisateurs/roles"
                className="flex w-fit cursor-pointer items-center gap-2 rounded-md border border-gray-200 bg-white p-4 font-medium text-gray-800 transition-all duration-300 hover:bg-gray-50"
              >
                <ListChecks className="size-4" /> Rôles et permissions
              </Link>
              <Link
                href="/dashboard/utilisateurs/permissions"
                className="flex w-fit cursor-pointer items-center gap-2 rounded-md border border-gray-200 bg-white p-4 font-medium text-gray-800 transition-all duration-300 hover:bg-gray-50"
              >
                <KeyRound className="size-4" /> Catalogue permissions
              </Link>
              <Link
                href="/dashboard/utilisateurs/permissions/add"
                className="flex w-fit cursor-pointer items-center gap-2 rounded-md border border-orange-200 bg-orange-50 p-4 font-medium text-orange-900 transition-all duration-300 hover:bg-orange-100"
              >
                <Plus className="size-4" /> Nouvelle permission
              </Link>
            </>
          )}
          <Link
            href="/dashboard/utilisateurs/roles/add"
            className="flex w-fit cursor-pointer items-center gap-2 rounded-md border border-orange-200 bg-orange-50 p-4 font-medium text-orange-900 transition-all duration-300 hover:bg-orange-100"
          >
            <ShieldPlus className="size-4" /> Nouveau rôle
          </Link>
        </div>
        <h1 className="shrink-0 text-4xl font-extrabold text-orange-500">
          Utilisateurs
        </h1>
        <div className="flex-1" />
      </div>

      {isError && (
        <p className="text-center text-red-600">
          Impossible de charger les utilisateurs.
        </p>
      )}

      {isLoading ? (
        <p className="flex flex-1 items-center justify-center text-center text-gray-600">
          Chargement…
        </p>
      ) : users.length === 0 ? (
        <p className="flex flex-1 items-center justify-center text-center text-gray-600">
          Aucun utilisateur.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 font-semibold text-gray-900">Email</th>
                <th className="px-4 py-3 font-semibold text-gray-900">Rôle</th>
                <th className="px-4 py-3 font-semibold text-gray-900">
                  Organisation
                </th>
                <th className="px-4 py-3 font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-gray-100 hover:bg-gray-50/80"
                >
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {u.email}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{u.role.name}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {u.organization.name}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/utilisateurs/${u.id}`}
                      className="text-orange-600 underline-offset-2 hover:underline"
                    >
                      Détails
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
