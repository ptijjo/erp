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

import { hasMePermission, isAdminUser, isMainOrganization, useMe } from "~/hooks/use-me";
import { api } from "~/lib/api";
import type { PoleDto, UserListItemDto } from "~/lib/api-types";

import { rolePoleLabel } from "./_lib/pole-label";
import { userDisplayName } from "./_lib/user-display";
import { PolesWithUsersSection } from "./_components/PolesWithUsersSection";
import { UserProfileAvatar } from "./_components/UserProfileAvatar";

type UserSortColumn = "organization" | "role" | "pole";

function UserSortIcon({
  column,
  sortBy,
  sortOrder,
}: {
  column: UserSortColumn;
  sortBy: UserSortColumn;
  sortOrder: "asc" | "desc";
}) {
  if (sortBy !== column) {
    return <ArrowUpDown className="size-3.5 text-gray-400" />;
  }
  return sortOrder === "asc" ? (
    <ArrowUp className="size-3.5 text-orange-600" />
  ) : (
    <ArrowDown className="size-3.5 text-orange-600" />
  );
}

export default function UtilisateursPage() {
  const router = useRouter();
  const [sortBy, setSortBy] = useState<UserSortColumn>("organization");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const { data: me, isPending: mePending } = useMe();
  const canReadUser = me != null && hasMePermission(me, "read", "User");
  const canCreateUser = me != null && hasMePermission(me, "create", "User");
  const canCreateRole = me != null && hasMePermission(me, "create", "Role");
  const canOpenRoles = me != null && hasMePermission(me, "read", "Role");
  const canReadPole = me != null && hasMePermission(me, "read", "Pole");
  const canCreatePole = me != null && hasMePermission(me, "create", "Pole");
  const catalogPermissionsAdmin = me != null && isAdminUser(me);
  const showPolesSection =
    canReadPole && me != null && isMainOrganization(me);

  const { data: users = [], isLoading, isError } = useQuery({
    queryKey: ["user"] as const,
    queryFn: async () => {
      const { data } = await api.get<UserListItemDto[]>("/user");
      return data;
    },
    enabled: !mePending && canReadUser,
  });

  const {
    data: poles = [],
    isLoading: polesLoading,
    isError: polesError,
  } = useQuery({
    queryKey: ["poles"] as const,
    queryFn: async () => {
      const { data } = await api.get<PoleDto[]>("/poles");
      return data;
    },
    enabled: canReadPole && me != null && isMainOrganization(me),
  });

  const sortedUsers = useMemo(() => {
    const collator = new Intl.Collator("fr", { sensitivity: "base" });
    return [...users].sort((a, b) => {
      const left =
        sortBy === "organization"
          ? a.organization.name
          : sortBy === "role"
            ? a.role.name
            : rolePoleLabel(a.role.pole);
      const right =
        sortBy === "organization"
          ? b.organization.name
          : sortBy === "role"
            ? b.role.name
            : rolePoleLabel(b.role.pole);
      const result = collator.compare(left, right);
      return sortOrder === "asc" ? result : -result;
    });
  }, [users, sortBy, sortOrder]);

  function toggleSort(column: UserSortColumn) {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(column);
    setSortOrder("asc");
  }

  return (
    <main className="flex h-full min-h-0 min-w-0 w-full flex-1 flex-col gap-6 overflow-auto bg-white p-6">
      <div className="flex w-full items-center">
        <div className="flex flex-1 flex-wrap justify-start gap-3">
          {canCreateUser ? (
            <Link
              href="/dashboard/utilisateurs/add"
              className="flex w-fit cursor-pointer items-center gap-2 rounded-md bg-gray-100 p-4 transition-all duration-300 hover:bg-gray-200"
            >
              <SquarePlus className="size-4" /> Ajouter un utilisateur
            </Link>
          ) : null}
          {canOpenRoles ? (
            <Link
              href="/dashboard/utilisateurs/roles"
              className="flex w-fit cursor-pointer items-center gap-2 rounded-md border border-gray-200 bg-white p-4 font-medium text-gray-800 transition-all duration-300 hover:bg-gray-50"
            >
              <ListChecks className="size-4" /> Rôles et permissions
            </Link>
          ) : null}
          {catalogPermissionsAdmin ? (
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
          ) : null}
          {canCreateRole ? (
            <Link
              href="/dashboard/utilisateurs/roles/add"
              className="flex w-fit cursor-pointer items-center gap-2 rounded-md border border-orange-200 bg-orange-50 p-4 font-medium text-orange-900 transition-all duration-300 hover:bg-orange-100"
            >
              <ShieldPlus className="size-4" /> Nouveau rôle
            </Link>
          ) : null}
        </div>
        <h1 className="shrink-0 text-4xl font-extrabold text-orange-500">
          Utilisateurs
        </h1>
        <div className="flex-1" />
      </div>

      {showPolesSection ? (
        <PolesWithUsersSection
          poles={poles}
          users={users}
          polesLoading={polesLoading}
          polesError={polesError}
          canCreatePole={canCreatePole}
        />
      ) : null}

      {isError ? (
        <p className="text-center text-red-600">
          Impossible de charger les utilisateurs.
        </p>
      ) : null}

      {isLoading ? (
        <p className="flex flex-1 items-center justify-center text-center text-gray-600">
          Chargement…
        </p>
      ) : users.length === 0 ? (
        <p className="flex flex-1 items-center justify-center text-center text-gray-600">
          Aucun utilisateur.
        </p>
      ) : (
        <div className="space-y-3">
          {showPolesSection ? (
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              Tous les utilisateurs
            </h2>
          ) : null}
          <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 font-semibold text-gray-900">
                  Utilisateur
                </th>
                <th className="px-4 py-3 font-semibold text-gray-900">Email</th>
                <th className="px-4 py-3 font-semibold text-gray-900">
                  <button
                    type="button"
                    className="inline-flex cursor-pointer items-center gap-1.5 text-left hover:text-orange-600"
                    onClick={() => toggleSort("role")}
                    aria-label="Trier par rôle"
                  >
                    Rôle
                    <UserSortIcon
                      column="role"
                      sortBy={sortBy}
                      sortOrder={sortOrder}
                    />
                  </button>
                </th>
                <th className="px-4 py-3 font-semibold text-gray-900">
                  <button
                    type="button"
                    className="inline-flex cursor-pointer items-center gap-1.5 text-left hover:text-orange-600"
                    onClick={() => toggleSort("pole")}
                    aria-label="Trier par pôle"
                  >
                    Pôle
                    <UserSortIcon
                      column="pole"
                      sortBy={sortBy}
                      sortOrder={sortOrder}
                    />
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
                    <UserSortIcon
                      column="organization"
                      sortBy={sortBy}
                      sortOrder={sortOrder}
                    />
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
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <UserProfileAvatar
                        email={u.email}
                        firstName={u.firstName}
                        lastName={u.lastName}
                        profilePhotoUrl={u.profilePhotoUrl}
                        size="md"
                        className="size-10 ring-1"
                      />
                      <span className="font-medium text-gray-900">
                        {userDisplayName(u)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{u.email}</td>
                  <td className="px-4 py-3 text-gray-700">{u.role.name}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {u.role.pole ? (
                      <span title={u.role.pole.code}>
                        {rolePoleLabel(u.role.pole)}
                      </span>
                    ) : (
                      <span className="text-gray-400">
                        {rolePoleLabel(null)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {u.organization.name}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </main>
  );
}
