"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  KeyRound,
  ListChecks,
  Plus,
  ShieldPlus,
  SquarePlus,
} from "lucide-react";

import { hasMePermission, isAdminUser, useMe } from "~/hooks/use-me";
import { api } from "~/lib/api";
import type { UserListItemDto } from "~/lib/api-types";

export default function UtilisateursPage() {
  const router = useRouter();
  const [sortBy, setSortBy] = useState<"organization" | "role">("organization");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const { data: me } = useMe();
  const canCreateUser = me != null && hasMePermission(me, "create", "User");
  const canCreateRole = me != null && hasMePermission(me, "create", "Role");
  const canOpenRoles =
    me != null && hasMePermission(me, "read", "Role");
  const catalogPermissionsAdmin =
    me != null && isAdminUser(me);
  const { data: users = [], isLoading, isError } = useQuery({
    queryKey: ["user"] as const,
    queryFn: async () => {
      const { data } = await api.get<UserListItemDto[]>("/user");
      return data;
    },
  });
  const sortedUsers = useMemo(() => {
    const collator = new Intl.Collator("fr", { sensitivity: "base" });
    return [...users].sort((a, b) => {
      const left =
        sortBy === "organization" ? a.organization.name : a.role.name;
      const right =
        sortBy === "organization" ? b.organization.name : b.role.name;
      const result = collator.compare(left, right);
      return sortOrder === "asc" ? result : -result;
    });
  }, [users, sortBy, sortOrder]);

  function toggleSort(column: "organization" | "role") {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(column);
    setSortOrder("asc");
  }

  function SortIcon({ column }: { column: "organization" | "role" }) {
    if (sortBy !== column) {
      return <ArrowUpDown className="size-3.5 text-gray-400" />;
    }
    return sortOrder === "asc" ? (
      <ArrowUp className="size-3.5 text-orange-600" />
    ) : (
      <ArrowDown className="size-3.5 text-orange-600" />
    );
  }

  return (
    <main className="flex h-full min-h-0 min-w-0 w-full flex-1 flex-col gap-4 overflow-auto bg-white p-6">
      <div className="flex w-full items-center">
        <div className="flex flex-1 flex-wrap justify-start gap-3">
          {canCreateUser && (
            <Link
              href="/dashboard/utilisateurs/add"
              className="flex w-fit cursor-pointer items-center gap-2 rounded-md bg-gray-100 p-4 transition-all duration-300 hover:bg-gray-200"
            >
              <SquarePlus className="size-4" /> Ajouter un utilisateur
            </Link>
          )}
          {canOpenRoles && (
            <Link
              href="/dashboard/utilisateurs/roles"
              className="flex w-fit cursor-pointer items-center gap-2 rounded-md border border-gray-200 bg-white p-4 font-medium text-gray-800 transition-all duration-300 hover:bg-gray-50"
            >
              <ListChecks className="size-4" /> Rôles et permissions
            </Link>
          )}
          {catalogPermissionsAdmin && (
            <>
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
          {canCreateRole && (
            <Link
              href="/dashboard/utilisateurs/roles/add"
              className="flex w-fit cursor-pointer items-center gap-2 rounded-md border border-orange-200 bg-orange-50 p-4 font-medium text-orange-900 transition-all duration-300 hover:bg-orange-100"
            >
              <ShieldPlus className="size-4" /> Nouveau rôle
            </Link>
          )}
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
                <th className="px-4 py-3 font-semibold text-gray-900">
                  <button
                    type="button"
                    className="inline-flex cursor-pointer items-center gap-1.5 text-left hover:text-orange-600"
                    onClick={() => toggleSort("role")}
                    aria-label="Trier par rôle"
                  >
                    Rôle
                    <SortIcon column="role" />
                  </button>
                </th>
                <th className="px-4 py-3 font-semibold text-gray-900">
                  <button
                    type="button"
                    className="inline-flex cursor-pointer items-center gap-1.5 text-left hover:text-orange-600"
                    onClick={() => toggleSort("organization")}
                    aria-label="Trier par organisation"
                  >
                    Organisation
                    <SortIcon column="organization" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedUsers.map((u) => (
                <tr
                  key={u.id}
                  className="cursor-pointer border-b border-gray-100 hover:bg-gray-50/80"
                  onClick={() => router.push(`/dashboard/utilisateurs/${u.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      router.push(`/dashboard/utilisateurs/${u.id}`);
                    }
                  }}
                  tabIndex={0}
                  role="link"
                  aria-label={`Voir les détails de ${u.email}`}
                >
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {u.email}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{u.role.name}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {u.organization.name}
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
