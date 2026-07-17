"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Layers, Pencil, Trash2 } from "lucide-react";

import { rolePoleLabel } from "../_lib/pole-label";
import { userDisplayName } from "../_lib/user-display";
import { UserProfileAvatar } from "./UserProfileAvatar";
import type { PoleDto, UserListItemDto } from "~/lib/api-types";
import { api } from "~/lib/api";
import { apiErrorMessage } from "~/lib/api-error-message";
import { isSystemPoleCode } from "~/lib/system-poles";

const HORS_POLE_KEY = "__hors_pole__";

type Props = {
  poles: PoleDto[];
  users: UserListItemDto[];
  polesLoading: boolean;
  polesError: boolean;
  canCreatePole: boolean;
  canUpdatePole: boolean;
  canDeletePole: boolean;
};

function usersForPole(
  users: UserListItemDto[],
  poleCode: string,
): UserListItemDto[] {
  const collator = new Intl.Collator("fr", { sensitivity: "base" });
  return users
    .filter(
      (u) =>
        u.organization.organizationType === "MAIN" &&
        u.role.pole?.code === poleCode,
    )
    .sort((a, b) => collator.compare(userDisplayName(a), userDisplayName(b)));
}

function horsPoleUsers(users: UserListItemDto[]): UserListItemDto[] {
  const collator = new Intl.Collator("fr", { sensitivity: "base" });
  return users
    .filter(
      (u) => u.organization.organizationType === "MAIN" && !u.role.pole,
    )
    .sort((a, b) => collator.compare(userDisplayName(a), userDisplayName(b)));
}

function PoleUsersList({
  poleUsers,
  onUserClick,
}: {
  poleUsers: UserListItemDto[];
  onUserClick: (id: string) => void;
}) {
  if (poleUsers.length === 0) {
    return (
      <p className="px-4 py-3 text-sm text-gray-500">
        Aucun utilisateur rattaché à ce pôle.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-gray-100 border-t border-orange-100">
      {poleUsers.map((u) => (
        <li key={u.id}>
          <button
            type="button"
            className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-orange-50/50"
            onClick={() => onUserClick(u.id)}
          >
            <UserProfileAvatar
              email={u.email}
              firstName={u.firstName}
              lastName={u.lastName}
              profilePhotoUrl={u.profilePhotoUrl}
              size="md"
              className="size-9 ring-1"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-gray-900">
                {userDisplayName(u)}
              </p>
              <p className="truncate text-xs text-gray-600">{u.email}</p>
            </div>
            <span className="shrink-0 rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
              {u.role.name}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function PolesWithUsersSection({
  poles,
  users,
  polesLoading,
  polesError,
  canCreatePole,
  canUpdatePole,
  canDeletePole,
}: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const horsPole = useMemo(() => horsPoleUsers(users), [users]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/poles/${id}`);
    },
    onSuccess: async () => {
      setDeleteError(null);
      await queryClient.invalidateQueries({ queryKey: ["poles"] });
    },
    onError: (err) => {
      setDeleteError(apiErrorMessage(err, "Impossible de supprimer le pôle"));
    },
  });

  function toggle(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function goToUser(id: string) {
    router.push(`/dashboard/utilisateurs/${id}`);
  }

  function confirmDelete(pole: PoleDto) {
    const systemNote = isSystemPoleCode(pole.code)
      ? "\n\nAttention : pôle système VIFAA — le seeder pourra le recréer au prochain démarrage de l’API."
      : "";
    const ok = window.confirm(
      `Supprimer le pôle « ${pole.name} » (${pole.code}) ?\nLes rôles rattachés seront détachés (sans pôle).${systemNote}`,
    );
    if (!ok) return;
    deleteMutation.mutate(pole.id);
  }

  return (
    <section className="rounded-xl border border-orange-200 bg-orange-50/30 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <Layers className="size-5 text-orange-500" />
            Pôles maison mère
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Dépliez un pôle pour voir les utilisateurs VIFAA rattachés. ADMIN et
            directeur général sont listés sous « Hors pôle ».
          </p>
        </div>
        {canCreatePole ? (
          <Link
            href="/dashboard/hq/organisations/poles/add"
            className="flex w-fit shrink-0 cursor-pointer items-center gap-2 rounded-md border border-orange-300 bg-white px-4 py-2 text-sm font-medium text-orange-900 transition-colors hover:bg-orange-50"
          >
            <Layers className="size-4" />
            Nouveau pôle
          </Link>
        ) : null}
      </div>

      {deleteError ? (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {deleteError}
        </p>
      ) : null}

      {polesLoading ? (
        <p className="mt-4 text-sm text-gray-600">Chargement des pôles…</p>
      ) : polesError ? (
        <p className="mt-4 text-sm text-red-600">
          Impossible de charger la liste des pôles.
        </p>
      ) : poles.length === 0 ? (
        <p className="mt-4 text-sm text-gray-600">Aucun pôle enregistré.</p>
      ) : (
        <div className="mt-4 space-y-2">
          {poles.map((p) => {
            const poleUsers = usersForPole(users, p.code);
            const isOpen = expanded.has(p.id);
            const systemPole = isSystemPoleCode(p.code);
            return (
              <div
                key={p.id}
                className="overflow-hidden rounded-lg border border-orange-100 bg-white shadow-sm"
              >
                <div className="flex items-start gap-1">
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 cursor-pointer items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50/80"
                    onClick={() => toggle(p.id)}
                    aria-expanded={isOpen}
                  >
                    {isOpen ? (
                      <ChevronDown className="mt-0.5 size-5 shrink-0 text-orange-600" />
                    ) : (
                      <ChevronRight className="mt-0.5 size-5 shrink-0 text-gray-400" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-gray-900">
                          {p.name}
                        </span>
                        <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-900">
                          {poleUsers.length} utilisateur
                          {poleUsers.length !== 1 ? "s" : ""}
                        </span>
                        {systemPole ? (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                            Système
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 font-mono text-xs text-gray-500">
                        {p.code}
                      </p>
                      {p.description ? (
                        <p className="mt-1 text-sm text-gray-600">
                          {p.description}
                        </p>
                      ) : null}
                    </div>
                  </button>
                  <div className="flex shrink-0 items-center gap-1 pr-3 pt-3">
                    {canUpdatePole ? (
                      <Link
                        href={`/dashboard/hq/organisations/poles/${p.id}/edit`}
                        className="inline-flex size-8 items-center justify-center rounded-md text-gray-600 transition-colors hover:bg-orange-50 hover:text-orange-800"
                        title="Modifier"
                        aria-label={`Modifier ${p.name}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Pencil className="size-4" />
                      </Link>
                    ) : null}
                    {canDeletePole ? (
                      <button
                        type="button"
                        className="inline-flex size-8 items-center justify-center rounded-md text-gray-600 transition-colors hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                        title={
                          systemPole
                            ? "Supprimer (pôle système — peut être recréé au démarrage)"
                            : "Supprimer"
                        }
                        aria-label={`Supprimer ${p.name}`}
                        disabled={deleteMutation.isPending}
                        onClick={(e) => {
                          e.stopPropagation();
                          confirmDelete(p);
                        }}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    ) : null}
                  </div>
                </div>
                {isOpen ? (
                  <PoleUsersList
                    poleUsers={poleUsers}
                    onUserClick={goToUser}
                  />
                ) : null}
              </div>
            );
          })}

          {horsPole.length > 0 ? (
            <div className="overflow-hidden rounded-lg border border-dashed border-gray-300 bg-white/80">
              <button
                type="button"
                className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50/80"
                onClick={() => toggle(HORS_POLE_KEY)}
                aria-expanded={expanded.has(HORS_POLE_KEY)}
              >
                {expanded.has(HORS_POLE_KEY) ? (
                  <ChevronDown className="size-5 shrink-0 text-orange-600" />
                ) : (
                  <ChevronRight className="size-5 shrink-0 text-gray-400" />
                )}
                <div className="flex flex-1 flex-wrap items-center gap-2">
                  <span className="font-semibold text-gray-900">
                    {rolePoleLabel(null)}
                  </span>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                    {horsPole.length} utilisateur
                    {horsPole.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </button>
              {expanded.has(HORS_POLE_KEY) ? (
                <PoleUsersList poleUsers={horsPole} onUserClick={goToUser} />
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
