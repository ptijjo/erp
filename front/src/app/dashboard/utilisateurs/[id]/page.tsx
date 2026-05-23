"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";

import { hasMePermission, useMe } from "~/hooks/use-me";
import { api } from "~/lib/api";
import type { UserDetailDto } from "~/lib/api-types";

import { apiErrorMessage } from "~/lib/api-error-message";
import { rolePoleLabel } from "../_lib/pole-label";
import { userDisplayName } from "../_lib/user-display";
import { UserProfileAvatar } from "../_components/UserProfileAvatar";

export default function UserDetailPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  const canUpdateUser = me != null && hasMePermission(me, "update", "User");
  const canDeleteUser = me != null && hasMePermission(me, "delete", "User");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const params = useParams();
  const id =
    typeof params.id === "string"
      ? params.id
      : Array.isArray(params.id)
        ? params.id[0]
        : "";

  const { data: user, isLoading, isError } = useQuery({
    queryKey: ["user", id] as const,
    queryFn: async () => {
      const { data } = await api.get<UserDetailDto>(`/user/${id}`);
      return data;
    },
    enabled: Boolean(id),
  });

  const isSelf = me != null && user != null && me.sub === user.id;

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/user/${id}`);
    },
    onSuccess: async () => {
      setDeleteError(null);
      await queryClient.invalidateQueries({ queryKey: ["user"] });
      router.push("/dashboard/utilisateurs");
    },
    onError: (err) => {
      setDeleteError(
        apiErrorMessage(err, "Impossible de supprimer l’utilisateur"),
      );
    },
  });

  return (
    <main className="flex h-full min-h-0 min-w-0 w-full flex-1 flex-col overflow-auto bg-white p-6">
      <div className="flex w-full flex-wrap items-center gap-3">
        <div className="flex min-w-0 flex-1 justify-start">
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
        <div className="flex min-w-0 flex-1 justify-end">
          {user && !isLoading && !isError ? (
            <div className="flex flex-wrap items-center justify-end gap-3">
              {canUpdateUser && (
                <Link
                  href={`/dashboard/utilisateurs/${id}/edit`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-900 transition-colors hover:bg-orange-100"
                >
                  <Pencil className="size-4" />
                  Modifier
                </Link>
              )}
              {canDeleteUser && (
                <button
                  type="button"
                  title={
                    isSelf
                      ? "Vous ne pouvez pas supprimer votre propre compte"
                      : undefined
                  }
                  disabled={deleteMutation.isPending || isSelf}
                  onClick={() => {
                    if (
                      !window.confirm(
                        `Supprimer définitivement l’utilisateur « ${user.email} » ? Cette action est irréversible.`,
                      )
                    ) {
                      return;
                    }
                    setDeleteError(null);
                    deleteMutation.mutate();
                  }}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-800 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 className="size-4" />
                  Supprimer
                </button>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {deleteError && (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {deleteError}
        </p>
      )}

      {isError && (
        <p className="mt-8 text-red-600">
          Utilisateur introuvable ou accès refusé.
        </p>
      )}

      {isLoading ? (
        <p className="mt-8 text-gray-600">Chargement…</p>
      ) : user ? (
        <div className="mt-8 max-w-2xl">
          <div className="flex flex-col gap-6 border-b border-gray-200 pb-8 sm:flex-row sm:items-center">
            <UserProfileAvatar
              email={user.email}
              firstName={user.firstName}
              lastName={user.lastName}
              profilePhotoUrl={user.profilePhotoUrl}
              size="lg"
            />
            <div className="min-w-0 flex-1 space-y-1">
              <h2 className="text-2xl font-semibold text-gray-900">
                {userDisplayName(user)}
              </h2>
              <p className="text-sm text-gray-600">{user.email}</p>
              <p className="text-sm text-gray-500">
                {user.role.name}
                {user.role.pole
                  ? ` · ${rolePoleLabel(user.role.pole)}`
                  : ` · ${rolePoleLabel(null)}`}
              </p>
              {canUpdateUser ? (
                <p className="pt-1 text-xs text-muted-foreground">
                  {user.profilePhotoUrl?.trim()
                    ? "Photo définie via une URL — modifiable depuis l’édition du profil."
                    : "Aucune photo : initiales affichées — vous pouvez ajouter une URL depuis l’édition."}
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-6 space-y-3 text-gray-800">
          <p>
            <span className="font-semibold text-gray-900">Email :</span>{" "}
            {user.email}
          </p>
          <p>
            <span className="font-semibold text-gray-900">Rôle :</span>{" "}
            {user.role.name}
          </p>
          <p>
            <span className="font-semibold text-gray-900">Pôle :</span>{" "}
            {user.role.pole ? (
              <>
                {rolePoleLabel(user.role.pole)}
                <span className="ml-2 font-mono text-xs text-gray-500">
                  ({user.role.pole.code})
                </span>
              </>
            ) : (
              <span className="text-gray-500">{rolePoleLabel(null)}</span>
            )}
          </p>
          {user.role.description ? (
            <p className="text-sm text-gray-600">{user.role.description}</p>
          ) : null}
          <p className="text-sm text-gray-500">
            <span className="font-medium text-gray-700">Organisation (slug) :</span>{" "}
            <code className="font-mono">
              {user.organization?.slug ?? "—"}
            </code>
          </p>
          <p className="text-sm text-gray-500">
            <span className="font-medium text-gray-700">
              Date de création :
            </span>{" "}
            {new Date(user.createdAt).toLocaleString("fr-FR", {
              dateStyle: "long",
              timeStyle: "short",
            })}
          </p>
          <p className="text-sm text-gray-500">
            <span className="font-medium text-gray-700">
              Dernière mise à jour :
            </span>{" "}
            {new Date(user.updatedAt).toLocaleString("fr-FR", {
              dateStyle: "long",
              timeStyle: "short",
            })}
          </p>
          <p className="text-sm text-gray-500">
            <span className="font-medium text-gray-700">Créé par :</span>{" "}
            {user.createdBy ? (
              <span className="text-gray-800">{user.createdBy.email}</span>
            ) : (
              <span className="italic text-gray-500">
                Non renseigné (journal d’audit absent ou création hors API)
              </span>
            )}
          </p>
          <p className="text-sm text-gray-500">
            <span className="font-medium text-gray-700">Id :</span>{" "}
            <code className="font-mono">{user.id}</code>
          </p>
          </div>
        </div>
      ) : null}
    </main>
  );
}
