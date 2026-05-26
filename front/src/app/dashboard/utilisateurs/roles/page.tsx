"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  KeyRound,
  ListChecks,
  Pencil,
  Plus,
  ShieldPlus,
  Trash2,
} from "lucide-react";

import { DashboardTitleBar } from "~/components/layout/dashboard-title-bar";
import { TableScroll } from "~/components/layout/table-scroll";
import { hasMePermission, isAdminUser, useMe } from "~/hooks/use-me";
import { api } from "~/lib/api";
import type { RoleDto } from "~/lib/api-types";
import {
  dashboardActionLinkOutline,
  dashboardActionLinkPrimary,
  dashboardBackLinkClass,
  dashboardMainClass,
} from "~/lib/dashboard-styles";

import { apiErrorMessage } from "~/lib/api-error-message";
import { isFullAccessRole } from "../_lib/full-access-roles";

export default function RolesListPage() {
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  const catalogAdminOnly = me != null && isAdminUser(me);
  const canCreatePermission =
    catalogAdminOnly &&
    me != null &&
    hasMePermission(me, "create", "Permission");
  const canUpdatePermission =
    me != null && hasMePermission(me, "update", "Permission");
  const canCreateRole = me != null && hasMePermission(me, "create", "Role");
  const canUpdateRole = me != null && hasMePermission(me, "update", "Role");
  const canDeleteRole = me != null && hasMePermission(me, "delete", "Role");
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data: roles = [], isLoading, isError } = useQuery({
    queryKey: ["role"] as const,
    queryFn: async () => {
      const { data } = await api.get<RoleDto[]>("/role");
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (roleId: string) => {
      await api.delete(`/role/${roleId}`);
    },
    onSuccess: async () => {
      setDeleteError(null);
      await queryClient.invalidateQueries({ queryKey: ["role"] });
    },
    onError: (err) => {
      setDeleteError(apiErrorMessage(err, "Suppression impossible"));
    },
  });

  const sorted = [...roles].sort((a, b) =>
    a.name.localeCompare(b.name, "fr"),
  );

  return (
    <main className={`${dashboardMainClass} gap-6`}>
      <DashboardTitleBar
        title="Rôles"
        icon={ListChecks}
        actions={
          <>
            <Link href="/dashboard/utilisateurs" className={dashboardBackLinkClass}>
              Retour
            </Link>
            {catalogAdminOnly ? (
              <>
                <Link
                  href="/dashboard/utilisateurs/permissions"
                  className={dashboardActionLinkOutline}
                >
                  <KeyRound className="size-4 shrink-0" />
                  Catalogue permissions
                </Link>
                {canCreatePermission ? (
                  <Link
                    href="/dashboard/utilisateurs/permissions/add"
                    className={dashboardActionLinkPrimary}
                  >
                    <Plus className="size-4 shrink-0" />
                    Nouvelle permission
                  </Link>
                ) : null}
              </>
            ) : null}
            {canCreateRole ? (
              <Link
                href="/dashboard/utilisateurs/roles/add"
                className={dashboardActionLinkPrimary}
              >
                <ShieldPlus className="size-4 shrink-0" />
                Nouveau rôle
              </Link>
            ) : null}
          </>
        }
      />

      {deleteError && (
        <p className="text-sm text-red-600" role="alert">
          {deleteError}
        </p>
      )}

      {isError && (
        <p className="text-center text-red-600">
          Impossible de charger les rôles.
        </p>
      )}

      {isLoading ? (
        <p className="flex flex-1 items-center justify-center text-gray-600">
          Chargement…
        </p>
      ) : sorted.length === 0 ? (
        <p className="flex flex-1 items-center justify-center text-gray-600">
          Aucun rôle.
        </p>
      ) : (
        <TableScroll className="border-gray-200">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 font-semibold text-gray-900">Nom</th>
                <th className="px-4 py-3 font-semibold text-gray-900">
                  Description
                </th>
                <th className="px-4 py-3 font-semibold text-gray-900">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-gray-100 hover:bg-gray-50/80"
                >
                  <td className="px-4 py-3 font-mono font-medium text-[#2D323E]">
                    {r.name}
                  </td>
                  <td className="max-w-md px-4 py-3 text-gray-700">
                    {r.description ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    {!canUpdatePermission && !canUpdateRole && !canDeleteRole ? (
                      <span className="text-xs text-gray-500">—</span>
                    ) : isFullAccessRole(r.name) ? (
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-gray-500">
                          Accès total (système)
                        </span>
                        {canUpdateRole && (
                          <Link
                            href={`/dashboard/utilisateurs/roles/${r.id}/edit`}
                            className="inline-flex w-fit items-center gap-1 text-gray-800 underline-offset-2 hover:underline"
                          >
                            <Pencil className="size-3.5" />
                            Modifier la description
                          </Link>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-1">
                        {canUpdatePermission && (
                          <Link
                            href={`/dashboard/utilisateurs/roles/${r.id}/permissions`}
                            className="text-orange-600 underline-offset-2 hover:underline"
                          >
                            Permissions
                          </Link>
                        )}
                        {canUpdateRole && (
                          <Link
                            href={`/dashboard/utilisateurs/roles/${r.id}/edit`}
                            className="inline-flex items-center gap-1 text-gray-800 underline-offset-2 hover:underline"
                          >
                            <Pencil className="size-3.5" />
                            Modifier
                          </Link>
                        )}
                        {canDeleteRole && (
                          <button
                            type="button"
                            disabled={deleteMutation.isPending}
                            onClick={() => {
                              if (
                                !window.confirm(
                                  `Supprimer le rôle « ${r.name} » ? Impossible s’il est encore attribué à des utilisateurs.`,
                                )
                              ) {
                                return;
                              }
                              setDeleteError(null);
                              deleteMutation.mutate(r.id);
                            }}
                            className="inline-flex cursor-pointer items-center gap-1 text-red-600 underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Trash2 className="size-3.5" />
                            Supprimer
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
      )}
    </main>
  );
}
