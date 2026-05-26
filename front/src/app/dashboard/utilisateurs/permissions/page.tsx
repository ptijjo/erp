"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Pencil, Plus, Trash2 } from "lucide-react";

import { DashboardTitleBar } from "~/components/layout/dashboard-title-bar";
import { TableScroll } from "~/components/layout/table-scroll";
import { hasMePermission, isAdminUser, useMe } from "~/hooks/use-me";
import { api } from "~/lib/api";
import type { PermissionDto } from "~/lib/api-types";
import {
  dashboardActionLinkPrimary,
  dashboardBackLinkClass,
  dashboardMainClass,
} from "~/lib/dashboard-styles";

import { apiErrorMessage } from "~/lib/api-error-message";

export default function PermissionsCatalogPage() {
  const queryClient = useQueryClient();
  const { data: me, isPending: mePending } = useMe();
  const catalogAdminOnly = me != null && isAdminUser(me);
  const canCreate =
    catalogAdminOnly && hasMePermission(me, "create", "Permission");
  const canUpdate =
    catalogAdminOnly && hasMePermission(me, "update", "Permission");
  const canDelete =
    catalogAdminOnly && hasMePermission(me, "delete", "Permission");

  const { data: permissions = [], isLoading, isError } = useQuery({
    queryKey: ["permission"] as const,
    queryFn: async () => {
      const { data } = await api.get<PermissionDto[]>("/permission");
      return data;
    },
    enabled: catalogAdminOnly,
  });

  const [deleteError, setDeleteError] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: async (permissionId: string) => {
      await api.delete(`/permission/${permissionId}`);
    },
    onSuccess: async () => {
      setDeleteError(null);
      await queryClient.invalidateQueries({ queryKey: ["permission"] });
    },
    onError: (err) => {
      setDeleteError(apiErrorMessage(err, "Suppression impossible"));
    },
  });

  const sorted = [...permissions].sort((a, b) =>
    a.name.localeCompare(b.name, "fr"),
  );

  if (mePending) {
    return (
      <main className={dashboardMainClass}>
        <p className="text-sm text-gray-600">Vérification des droits…</p>
      </main>
    );
  }

  if (me == null) {
    return (
      <main className={dashboardMainClass}>
        <div className="max-w-lg rounded-xl border border-gray-200 bg-gray-50 p-5 text-sm text-gray-800">
          <p className="font-semibold">Session non disponible</p>
          <Link
            href="/"
            className="mt-3 inline-block font-medium text-orange-600 underline-offset-2 hover:underline"
          >
            Se connecter
          </Link>
        </div>
      </main>
    );
  }

  if (!catalogAdminOnly) {
    return (
      <main className={dashboardMainClass}>
        <div
          className="max-w-lg rounded-xl border border-amber-200 bg-amber-50/80 p-5 text-sm text-amber-950"
          role="alert"
        >
          <p className="font-semibold">Accès refusé</p>
          <p className="mt-2">
            Le catalogue des permissions est réservé au compte administrateur
            (rôle ADMIN).
          </p>
          <Link
            href="/dashboard/utilisateurs/roles"
            className="mt-4 inline-block font-medium text-orange-700 underline-offset-2 hover:underline"
          >
            Retour aux rôles
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className={`${dashboardMainClass} gap-6`}>
      <DashboardTitleBar
        title="Permissions"
        icon={KeyRound}
        actions={
          <>
            <Link
              href="/dashboard/utilisateurs/roles"
              className={dashboardBackLinkClass}
            >
              Retour aux rôles
            </Link>
            {canCreate ? (
              <Link
                href="/dashboard/utilisateurs/permissions/add"
                className={dashboardActionLinkPrimary}
              >
                <Plus className="size-4 shrink-0" />
                Nouvelle permission
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
          Impossible de charger les permissions.
        </p>
      )}

      {isLoading ? (
        <p className="flex flex-1 items-center justify-center text-gray-600">
          Chargement…
        </p>
      ) : sorted.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="text-gray-600">
            Aucune permission en base. Créez-en une pour commencer, sans passer
            par un rôle.
          </p>
          {canCreate && (
            <Link
              href="/dashboard/utilisateurs/permissions/add"
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-orange-500 px-5 py-2.5 font-semibold text-white shadow-sm hover:opacity-95"
            >
              <Plus className="size-4" />
              Nouvelle permission
            </Link>
          )}
        </div>
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
              {sorted.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-gray-100 hover:bg-gray-50/80"
                >
                  <td className="px-4 py-3 font-mono font-medium text-[#2D323E]">
                    {p.name}
                  </td>
                  <td className="max-w-md px-4 py-3 text-gray-700">
                    {p.description ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-3">
                      {canUpdate && (
                        <Link
                          href={`/dashboard/utilisateurs/permissions/${p.id}/edit`}
                          className="inline-flex items-center gap-1 text-orange-600 underline-offset-2 hover:underline"
                        >
                          <Pencil className="size-3.5" />
                          Modifier
                        </Link>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          disabled={deleteMutation.isPending}
                          onClick={() => {
                            if (
                              !window.confirm(
                                `Supprimer la permission « ${p.name} » ? Les liaisons avec les rôles seront retirées.`,
                              )
                            ) {
                              return;
                            }
                            setDeleteError(null);
                            deleteMutation.mutate(p.id);
                          }}
                          className="inline-flex cursor-pointer items-center gap-1 text-red-600 underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Trash2 className="size-3.5" />
                          Supprimer
                        </button>
                      )}
                      {!canUpdate && !canDelete && (
                        <span className="text-xs text-gray-500">—</span>
                      )}
                    </div>
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
