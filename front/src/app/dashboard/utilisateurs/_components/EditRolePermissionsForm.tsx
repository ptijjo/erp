"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "~/lib/api";
import type { PermissionDto, PermissionRoleDto, RoleDto } from "~/lib/api-types";

import { apiErrorMessage } from "../../produits/_lib/api-error-message";
import { isFullAccessRole } from "../_lib/full-access-roles";

type Props = {
  roleId: string;
};

export default function EditRolePermissionsForm({ roleId }: Props) {
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [permSearch, setPermSearch] = useState("");
  const [rootError, setRootError] = useState<string | null>(null);

  const { data: role, isLoading: roleLoading, isError: roleError } = useQuery({
    queryKey: ["role", roleId] as const,
    queryFn: async () => {
      const { data } = await api.get<RoleDto>(`/role/${roleId}`);
      return data;
    },
    enabled: Boolean(roleId),
  });

  const { data: links = [], isLoading: linksLoading } = useQuery({
    queryKey: ["permission", "by-role", roleId] as const,
    queryFn: async () => {
      const { data } = await api.get<PermissionRoleDto[]>(
        `/permission/by-role/${roleId}`,
      );
      return data;
    },
    enabled:
      Boolean(roleId) &&
      role !== undefined &&
      !isFullAccessRole(role.name),
  });

  const { data: allPermissions = [], isLoading: permsLoading } = useQuery({
    queryKey: ["permission"] as const,
    queryFn: async () => {
      const { data } = await api.get<PermissionDto[]>("/permission");
      return data;
    },
    enabled: role !== undefined && !isFullAccessRole(role.name),
  });

  useEffect(() => {
    if (linksLoading) return;
    setSelectedIds(new Set(links.map((l) => l.permissionId)));
  }, [links, linksLoading]);

  const permissionsFiltered = useMemo(() => {
    const q = permSearch.trim().toLowerCase();
    const list = [...allPermissions].sort((a, b) =>
      a.name.localeCompare(b.name, "fr"),
    );
    if (!q) return list;
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description?.toLowerCase().includes(q) ?? false),
    );
  }, [allPermissions, permSearch]);

  const grantedPermissions = useMemo(() => {
    const byId = new Map(allPermissions.map((p) => [p.id, p]));
    return [...selectedIds]
      .map((id) => byId.get(id))
      .filter((p): p is PermissionDto => p !== undefined)
      .sort((a, b) => a.name.localeCompare(b.name, "fr"));
  }, [allPermissions, selectedIds]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const initial = new Set(links.map((l) => l.permissionId));
      for (const permissionId of initial) {
        if (!selectedIds.has(permissionId)) {
          await api.delete("/permission/link", {
            params: { permissionId, roleId },
          });
        }
      }
      for (const permissionId of selectedIds) {
        if (!initial.has(permissionId)) {
          await api.post("/permission/link", { permissionId, roleId });
        }
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["permission", "by-role", roleId],
      });
      await queryClient.invalidateQueries({ queryKey: ["permission"] });
      setRootError(null);
    },
    onError: (err) => {
      setRootError(
        apiErrorMessage(err, "Impossible d’enregistrer les permissions"),
      );
    },
  });

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (roleLoading) {
    return (
      <p className="text-sm text-gray-600">Chargement du rôle…</p>
    );
  }

  if (roleError || !role) {
    return (
      <p className="text-sm text-red-600" role="alert">
        Rôle introuvable ou accès refusé.
      </p>
    );
  }

  if (isFullAccessRole(role.name)) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-5 text-sm text-amber-950">
        <p className="font-semibold">Accès total (système)</p>
        <p className="mt-2 text-amber-900/90">
          Les rôles <span className="font-mono">{role.name}</span> ont un
          accès complet géré par l’application : les permissions en base ne
          s’appliquent pas à ce rôle. Modifiez plutôt les rôles métiers
          personnalisés.
        </p>
      </div>
    );
  }

  const busy =
    roleLoading ||
    linksLoading ||
    permsLoading ||
    saveMutation.isPending;

  return (
    <div className="flex w-full max-w-5xl flex-col gap-6">
      {rootError && (
        <p className="text-sm text-red-600" role="alert">
          {rootError}
        </p>
      )}

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-[#2D323E]">
          Permissions du rôle{" "}
          <span className="font-mono text-orange-600">{role.name}</span>
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          À gauche, cochez ou décochez dans le catalogue. À droite, la liste des
          droits actuellement accordés à ce rôle (avant enregistrement, elle
          reflète votre sélection). Les noms suivent le format{" "}
          <span className="font-mono">action:Sujet</span>. Tant qu’aucune
          permission n’est liée, le rôle garde un accès lecture par défaut.
        </p>

        <div className="mt-5 grid gap-6 lg:grid-cols-2">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-[#2D323E]">
              Catalogue
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              Sélectionner ou retirer des permissions pour ce rôle.
            </p>
            <input
              type="search"
              value={permSearch}
              onChange={(e) => setPermSearch(e.target.value)}
              placeholder="Filtrer par nom ou description…"
              disabled={busy}
              className="mt-3 h-10 w-full rounded-lg border border-gray-300 px-3 text-sm disabled:opacity-60"
            />
            <div className="mt-3 max-h-[min(22rem,45vh)] overflow-y-auto rounded-lg border border-gray-100 lg:max-h-[min(28rem,50vh)]">
              {permsLoading || linksLoading ? (
                <p className="p-4 text-sm text-gray-500">Chargement…</p>
              ) : permissionsFiltered.length === 0 ? (
                <p className="p-4 text-sm text-gray-500">
                  Aucune permission en base.
                </p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {permissionsFiltered.map((p) => (
                    <li key={p.id} className="flex items-start gap-3 px-3 py-2">
                      <input
                        type="checkbox"
                        id={`edit-perm-${p.id}`}
                        checked={selectedIds.has(p.id)}
                        onChange={() => toggle(p.id)}
                        disabled={saveMutation.isPending}
                        className="mt-1 size-4 shrink-0 cursor-pointer rounded border-gray-300 disabled:cursor-not-allowed"
                      />
                      <label
                        htmlFor={`edit-perm-${p.id}`}
                        className="min-w-0 flex-1 cursor-pointer text-sm"
                      >
                        <span className="font-mono font-medium text-[#2D323E]">
                          {p.name}
                        </span>
                        {p.description && (
                          <span className="mt-0.5 block text-gray-600">
                            {p.description}
                          </span>
                        )}
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="min-w-0 rounded-lg border border-orange-100 bg-orange-50/40 p-4">
            <h3 className="text-sm font-semibold text-[#2D323E]">
              Permissions accordées
              <span className="ml-2 font-normal text-gray-500">
                ({grantedPermissions.length})
              </span>
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              Droits inclus pour ce rôle après votre sélection. Enregistrez pour
              appliquer en base.
            </p>
            <div className="mt-3 max-h-[min(22rem,45vh)] overflow-y-auto rounded-lg border border-orange-100/80 bg-white/90 lg:max-h-[min(28rem,50vh)]">
              {permsLoading || linksLoading ? (
                <p className="p-4 text-sm text-gray-500">Chargement…</p>
              ) : grantedPermissions.length === 0 ? (
                <p className="p-4 text-sm text-gray-500">
                  Aucune permission sélectionnée. Cochez des entrées dans le
                  catalogue à gauche.
                </p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {grantedPermissions.map((p) => (
                    <li key={p.id} className="px-3 py-2.5">
                      <span className="font-mono text-sm font-medium text-[#2D323E]">
                        {p.name}
                      </span>
                      {p.description && (
                        <span className="mt-0.5 block text-xs text-gray-600">
                          {p.description}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </section>

      <button
        type="button"
        disabled={busy}
        onClick={() => {
          setRootError(null);
          saveMutation.mutate();
        }}
        className="w-fit rounded-lg bg-orange-500 px-6 py-2.5 font-semibold text-white shadow-sm hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saveMutation.isPending ? "Enregistrement…" : "Enregistrer"}
      </button>
    </div>
  );
}
