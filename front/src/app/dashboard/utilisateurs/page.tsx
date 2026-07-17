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

import { DashboardTitleBar } from "~/components/layout/dashboard-title-bar";
import { Button } from "~/components/ui/button";
import { DesktopOnly, MobileOnly } from "~/components/layout/viewport";
import { TableScroll } from "~/components/layout/table-scroll";
import { hasMePermission, isAdminUser, isMainOrganization, useMe } from "~/hooks/use-me";
import { api } from "~/lib/api";
import type { PaginatedResponse, PoleDto, UserListItemDto } from "~/lib/api-types";
import {
  dashboardActionLinkMuted,
  dashboardActionLinkOutline,
  dashboardActionLinkPrimary,
  dashboardMainClass,
} from "~/lib/dashboard-styles";

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
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [sortBy, setSortBy] = useState<UserSortColumn>("organization");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const { data: me, isPending: mePending } = useMe();
  const canReadUser = me != null && hasMePermission(me, "read", "User");
  const canCreateUser = me != null && hasMePermission(me, "create", "User");
  const canCreateRole = me != null && hasMePermission(me, "create", "Role");
  const canOpenRoles = me != null && hasMePermission(me, "read", "Role");
  const canReadPole = me != null && hasMePermission(me, "read", "Pole");
  const canCreatePole = me != null && hasMePermission(me, "create", "Pole");
  const canUpdatePole = me != null && hasMePermission(me, "update", "Pole");
  const canDeletePole = me != null && hasMePermission(me, "delete", "Pole");
  const catalogPermissionsAdmin = me != null && isAdminUser(me);
  const showPolesSection =
    canReadPole && me != null && isMainOrganization(me);

  const { data: usersPage, isLoading, isError } = useQuery({
    queryKey: ["user", page, pageSize] as const,
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<UserListItemDto>>(
        "/user",
        { params: { page, limit: pageSize } },
      );
      return data;
    },
    enabled: !mePending && canReadUser,
  });

  const users = usersPage?.items ?? [];
  const paginationMeta = usersPage?.meta;

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
    <main className={`${dashboardMainClass} gap-6`}>
      <DashboardTitleBar
        title="Utilisateurs"
        actions={
          <>
            {canCreateUser ? (
              <Link
                href="/dashboard/utilisateurs/add"
                className={dashboardActionLinkMuted}
              >
                <SquarePlus className="size-4 shrink-0" /> Ajouter un utilisateur
              </Link>
            ) : null}
            {canOpenRoles ? (
              <Link
                href="/dashboard/utilisateurs/roles"
                className={dashboardActionLinkOutline}
              >
                <ListChecks className="size-4 shrink-0" /> Rôles et permissions
              </Link>
            ) : null}
            {catalogPermissionsAdmin ? (
              <>
                <Link
                  href="/dashboard/utilisateurs/permissions"
                  className={dashboardActionLinkOutline}
                >
                  <KeyRound className="size-4 shrink-0" /> Catalogue permissions
                </Link>
                <Link
                  href="/dashboard/utilisateurs/permissions/add"
                  className={dashboardActionLinkPrimary}
                >
                  <Plus className="size-4 shrink-0" /> Nouvelle permission
                </Link>
              </>
            ) : null}
            {canCreateRole ? (
              <Link
                href="/dashboard/utilisateurs/roles/add"
                className={dashboardActionLinkPrimary}
              >
                <ShieldPlus className="size-4 shrink-0" /> Nouveau rôle
              </Link>
            ) : null}
          </>
        }
      />

      {showPolesSection ? (
        <PolesWithUsersSection
          poles={poles}
          users={users}
          polesLoading={polesLoading}
          polesError={polesError}
          canCreatePole={canCreatePole}
          canUpdatePole={canUpdatePole}
          canDeletePole={canDeletePole}
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
          <MobileOnly>
            <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200">
              {sortedUsers.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    className="flex w-full cursor-pointer gap-3 px-4 py-4 text-left transition-colors hover:bg-gray-50/80 active:bg-gray-100"
                    onClick={() => router.push(`/dashboard/utilisateurs/${u.id}`)}
                    aria-label={`Voir les détails de ${u.email}`}
                  >
                    <UserProfileAvatar
                      email={u.email}
                      firstName={u.firstName}
                      lastName={u.lastName}
                      profilePhotoUrl={u.profilePhotoUrl}
                      size="md"
                      className="size-10 shrink-0 ring-1"
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="truncate font-medium text-gray-900">
                        {userDisplayName(u)}
                      </p>
                      <p className="truncate text-sm text-gray-600">{u.email}</p>
                      <p className="text-xs text-gray-500">
                        {u.role.name}
                        {u.role.pole
                          ? ` · ${rolePoleLabel(u.role.pole)}`
                          : ` · ${rolePoleLabel(null)}`}
                      </p>
                      <p className="truncate text-xs text-gray-500">
                        {u.organization.name}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </MobileOnly>
          <DesktopOnly>
          <TableScroll className="border-gray-200">
          <table className="w-full text-left text-sm">
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
          </TableScroll>
          </DesktopOnly>
          {paginationMeta && paginationMeta.totalPages > 1 ? (
            <div className="flex items-center justify-between gap-4 pt-2">
              <p className="text-sm text-gray-600">
                Page {paginationMeta.page} sur {paginationMeta.totalPages} (
                {paginationMeta.total} utilisateur
                {paginationMeta.total > 1 ? "s" : ""})
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || isLoading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Précédent
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={
                    page >= paginationMeta.totalPages || isLoading
                  }
                  onClick={() =>
                    setPage((p) =>
                      Math.min(paginationMeta.totalPages, p + 1),
                    )
                  }
                >
                  Suivant
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </main>
  );
}
