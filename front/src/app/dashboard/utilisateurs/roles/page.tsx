"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  KeyRound,
  ListChecks,
  Pencil,
  Plus,
  ShieldPlus,
  Trash2,
} from "lucide-react";

import { useMe } from "~/hooks/use-me";
import { api } from "~/lib/api";
import type { RoleDto } from "~/lib/api-types";

import { apiErrorMessage } from "../../produits/_lib/api-error-message";
import { isFullAccessRole } from "../_lib/full-access-roles";

export default function RolesListPage() {
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  const canManagePermissions =
    me != null && isFullAccessRole(me.role.name);
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
    <main className="flex h-full min-h-0 min-w-0 w-full flex-1 flex-col gap-6 overflow-auto bg-white p-6">
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
            <ListChecks className="size-7" strokeWidth={1.75} />
          </div>
          <h1 className="text-3xl font-extrabold text-orange-500 sm:text-4xl">
            Rôles
          </h1>
        </div>
        <div className="flex flex-1 flex-wrap justify-end gap-3">
          {canManagePermissions && (
            <>
              <Link
                href="/dashboard/utilisateurs/permissions"
                className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-50"
              >
                <KeyRound className="size-4" />
                Catalogue permissions
              </Link>
              <Link
                href="/dashboard/utilisateurs/permissions/add"
                className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-900 transition-colors hover:bg-orange-100"
              >
                <Plus className="size-4" />
                Nouvelle permission
              </Link>
            </>
          )}
          <Link
            href="/dashboard/utilisateurs/roles/add"
            className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-900 transition-colors hover:bg-orange-100"
          >
            <ShieldPlus className="size-4" />
            Nouveau rôle
          </Link>
        </div>
      </div>

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
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full min-w-[720px] text-left text-sm">
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
                    {!canManagePermissions ? (
                      <span className="text-xs text-gray-500">—</span>
                    ) : isFullAccessRole(r.name) ? (
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-gray-500">
                          Accès total (système)
                        </span>
                        <Link
                          href={`/dashboard/utilisateurs/roles/${r.id}/edit`}
                          className="inline-flex w-fit items-center gap-1 text-gray-800 underline-offset-2 hover:underline"
                        >
                          <Pencil className="size-3.5" />
                          Modifier la description
                        </Link>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-1">
                        <Link
                          href={`/dashboard/utilisateurs/roles/${r.id}/permissions`}
                          className="text-orange-600 underline-offset-2 hover:underline"
                        >
                          Permissions
                        </Link>
                        <Link
                          href={`/dashboard/utilisateurs/roles/${r.id}/edit`}
                          className="inline-flex items-center gap-1 text-gray-800 underline-offset-2 hover:underline"
                        >
                          <Pencil className="size-3.5" />
                          Modifier
                        </Link>
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
                      </div>
                    )}
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
