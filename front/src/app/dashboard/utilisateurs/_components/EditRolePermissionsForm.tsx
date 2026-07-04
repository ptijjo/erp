"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Search,
  X,
} from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { api } from "~/lib/api";
import type { PermissionDto, PermissionRoleDto, RoleDto } from "~/lib/api-types";
import { apiErrorMessage } from "~/lib/api-error-message";
import {
  actionLabelForPermissionName,
  describePermissionName,
  groupLabelForPermissionName,
  POLICY_SUBJECT_GROUPS,
} from "~/lib/me-ability";
import { cn } from "~/lib/utils";

import { isFullAccessRole } from "../_lib/full-access-roles";

type Props = {
  roleId: string;
};

function linksSyncKey(links: PermissionRoleDto[]): string {
  return [...links]
    .map((l) => l.permissionId)
    .sort()
    .join(",");
}

function actionBadgeClass(action: string): string {
  switch (action) {
    case "read":
      return "border-blue-200 bg-blue-50 text-blue-800";
    case "create":
      return "border-green-200 bg-green-50 text-green-800";
    case "update":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "delete":
      return "border-red-200 bg-red-50 text-red-800";
    case "manage":
      return "border-orange-200 bg-orange-50 text-orange-900";
    default:
      return "border-border bg-muted text-muted-foreground";
  }
}

function PermissionActionBadge({ name }: { name: string }) {
  const label = actionLabelForPermissionName(name);
  if (!label) return null;
  const action = name.split(":")[0]?.toLowerCase() ?? "";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        actionBadgeClass(action),
      )}
    >
      {label}
    </span>
  );
}

type InnerProps = {
  roleId: string;
  role: RoleDto;
  links: PermissionRoleDto[];
  allPermissions: PermissionDto[];
};

function EditRolePermissionsFormInner({
  roleId,
  role,
  links,
  allPermissions,
}: InnerProps) {
  const queryClient = useQueryClient();
  const initialIds = useMemo(
    () => new Set(links.map((l) => l.permissionId)),
    [links],
  );
  const [selectedIds, setSelectedIds] = useState(
    () => new Set(links.map((l) => l.permissionId)),
  );
  const [permSearch, setPermSearch] = useState("");
  const [onlySelected, setOnlySelected] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    () => new Set(),
  );
  const [rootError, setRootError] = useState<string | null>(null);

  const permissionsFiltered = useMemo(() => {
    const q = permSearch.trim().toLowerCase();
    let list = [...allPermissions].sort((a, b) =>
      describePermissionName(a.name).localeCompare(
        describePermissionName(b.name),
        "fr",
      ),
    );
    if (onlySelected) {
      list = list.filter((p) => selectedIds.has(p.id));
    }
    if (!q) return list;
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        describePermissionName(p.name).toLowerCase().includes(q) ||
        (p.description?.toLowerCase().includes(q) ?? false) ||
        groupLabelForPermissionName(p.name).toLowerCase().includes(q),
    );
  }, [allPermissions, permSearch, onlySelected, selectedIds]);

  const permissionsByGroup = useMemo(() => {
    const order = [
      ...POLICY_SUBJECT_GROUPS.map((g) => g.label),
      "Wildcards",
      "Autre",
    ];
    const buckets = new Map<string, PermissionDto[]>();
    for (const p of permissionsFiltered) {
      const label = groupLabelForPermissionName(p.name);
      const list = buckets.get(label) ?? [];
      list.push(p);
      buckets.set(label, list);
    }
    return order
      .filter((label) => buckets.has(label))
      .map((label) => ({
        label,
        items: buckets.get(label) ?? [],
      }));
  }, [permissionsFiltered]);

  const grantedByGroup = useMemo(() => {
    const byId = new Map(allPermissions.map((p) => [p.id, p]));
    const granted = [...selectedIds]
      .map((id) => byId.get(id))
      .filter((p): p is PermissionDto => p !== undefined)
      .sort((a, b) =>
        describePermissionName(a.name).localeCompare(
          describePermissionName(b.name),
          "fr",
        ),
      );

    const order = [
      ...POLICY_SUBJECT_GROUPS.map((g) => g.label),
      "Wildcards",
      "Autre",
    ];
    const buckets = new Map<string, PermissionDto[]>();
    for (const p of granted) {
      const label = groupLabelForPermissionName(p.name);
      const list = buckets.get(label) ?? [];
      list.push(p);
      buckets.set(label, list);
    }
    return order
      .filter((label) => buckets.has(label))
      .map((label) => ({
        label,
        items: buckets.get(label) ?? [],
      }));
  }, [allPermissions, selectedIds]);

  const grantedCount = selectedIds.size;

  const changeCount = useMemo(() => {
    let n = 0;
    for (const id of selectedIds) {
      if (!initialIds.has(id)) n++;
    }
    for (const id of initialIds) {
      if (!selectedIds.has(id)) n++;
    }
    return n;
  }, [selectedIds, initialIds]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      for (const permissionId of initialIds) {
        if (!selectedIds.has(permissionId)) {
          await api.delete("/permission/link", {
            params: { permissionId, roleId },
          });
        }
      }
      for (const permissionId of selectedIds) {
        if (!initialIds.has(permissionId)) {
          await api.post("/permission/link", { permissionId, roleId });
        }
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["permission", "by-role", roleId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["permission", "assignment"],
      });
      setRootError(null);
    },
    onError: (err: unknown) => {
      setRootError(
        apiErrorMessage(err, "Impossible d'enregistrer les permissions"),
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

  function toggleGroup(items: PermissionDto[], select: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const p of items) {
        if (select) next.add(p.id);
        else next.delete(p.id);
      }
      return next;
    });
  }

  function toggleCollapse(label: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  function resetSelection() {
    setSelectedIds(new Set(initialIds));
    setRootError(null);
  }

  const busy = saveMutation.isPending;

  return (
    <div className="flex w-full max-w-6xl flex-col gap-4 pb-24">
      {rootError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">
          {rootError}
        </p>
      ) : null}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">
            Rôle{" "}
            <span className="font-mono text-primary">{role.name}</span>
          </CardTitle>
          <CardDescription>
            Cochez les droits dans le catalogue, vérifiez le récapitulatif à
            droite, puis enregistrez. Sans permission liée, le rôle conserve une
            lecture par défaut.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 text-sm">
            <span className="rounded-full border bg-muted/50 px-3 py-1">
              <strong>{grantedCount}</strong> permission
              {grantedCount > 1 ? "s" : ""} accordée
              {grantedCount > 1 ? "s" : ""}
            </span>
            <span className="rounded-full border bg-muted/50 px-3 py-1">
              <strong>{grantedByGroup.length}</strong> module
              {grantedByGroup.length > 1 ? "s" : ""} couvert
              {grantedByGroup.length > 1 ? "s" : ""}
            </span>
            {changeCount > 0 ? (
              <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-amber-950">
                <strong>{changeCount}</strong> modification
                {changeCount > 1 ? "s" : ""} non enregistrée
                {changeCount > 1 ? "s" : ""}
              </span>
            ) : (
              <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-green-900">
                Aucune modification en attente
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Catalogue */}
        <Card className="lg:col-span-3">
          <CardHeader className="space-y-3 pb-3">
            <div>
              <CardTitle className="text-base">Catalogue des droits</CardTitle>
              <CardDescription className="mt-1">
                Parcourez par module et cochez les actions autorisées.
              </CardDescription>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  value={permSearch}
                  onChange={(e) => setPermSearch(e.target.value)}
                  placeholder="Rechercher un droit ou un module…"
                  disabled={busy}
                  className="pl-8"
                />
              </div>
              <Button
                type="button"
                variant={onlySelected ? "default" : "outline"}
                size="sm"
                disabled={busy}
                onClick={() => setOnlySelected((v) => !v)}
                className="shrink-0"
              >
                {onlySelected ? "Tout afficher" : "Sélectionnées seulement"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[min(32rem,55vh)] overflow-y-auto border-t">
              {permissionsFiltered.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">
                  Aucune permission ne correspond à votre recherche.
                </p>
              ) : (
                <div className="divide-y">
                  {permissionsByGroup.map((group) => {
                    const selectedInGroup = group.items.filter((p) =>
                      selectedIds.has(p.id),
                    ).length;
                    const allSelected =
                      group.items.length > 0 &&
                      selectedInGroup === group.items.length;
                    const collapsed = collapsedGroups.has(group.label);

                    return (
                      <section key={group.label}>
                        <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b bg-muted/80 px-3 py-2 backdrop-blur-sm">
                          <button
                            type="button"
                            className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                            onClick={() => toggleCollapse(group.label)}
                          >
                            {collapsed ? (
                              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                            )}
                            <span className="truncate text-xs font-semibold uppercase tracking-wide text-foreground">
                              {group.label}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              ({selectedInGroup}/{group.items.length})
                            </span>
                          </button>
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              disabled={busy || allSelected}
                              onClick={() => toggleGroup(group.items, true)}
                            >
                              Tout
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              disabled={busy || selectedInGroup === 0}
                              onClick={() => toggleGroup(group.items, false)}
                            >
                              Aucun
                            </Button>
                          </div>
                        </div>
                        {!collapsed ? (
                          <ul>
                            {group.items.map((p) => {
                              const checked = selectedIds.has(p.id);
                              return (
                                <li
                                  key={p.id}
                                  className={cn(
                                    "flex items-start gap-3 border-b border-border/40 px-3 py-2.5 transition-colors last:border-b-0",
                                    checked && "bg-primary/5",
                                  )}
                                >
                                  <input
                                    type="checkbox"
                                    id={`edit-perm-${p.id}`}
                                    checked={checked}
                                    onChange={() => toggle(p.id)}
                                    disabled={busy}
                                    className="mt-1 size-4 shrink-0 cursor-pointer rounded border-input disabled:cursor-not-allowed"
                                  />
                                  <label
                                    htmlFor={`edit-perm-${p.id}`}
                                    className="min-w-0 flex-1 cursor-pointer"
                                  >
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="text-sm font-medium text-foreground">
                                        {describePermissionName(p.name)}
                                      </span>
                                      <PermissionActionBadge name={p.name} />
                                    </div>
                                    <span className="mt-0.5 block font-mono text-[11px] text-muted-foreground">
                                      {p.name}
                                    </span>
                                  </label>
                                </li>
                              );
                            })}
                          </ul>
                        ) : null}
                      </section>
                    );
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Récapitulatif */}
        <Card className="border-primary/20 bg-primary/2 lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Récapitulatif
              <span className="ml-2 font-normal text-muted-foreground">
                ({grantedCount})
              </span>
            </CardTitle>
            <CardDescription>
              Droits actifs pour ce rôle. Cliquez sur × pour retirer un droit.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[min(32rem,55vh)] overflow-y-auto border-t">
              {grantedCount === 0 ? (
                <div className="flex flex-col items-center gap-2 p-8 text-center">
                  <p className="text-sm font-medium text-muted-foreground">
                    Aucun droit sélectionné
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Cochez des permissions dans le catalogue pour les voir
                    apparaître ici.
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {grantedByGroup.map((group) => (
                    <section key={group.label}>
                      <h4 className="sticky top-0 z-10 bg-primary/5 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur-sm">
                        {group.label} ({group.items.length})
                      </h4>
                      <ul>
                        {group.items.map((p) => (
                          <li
                            key={p.id}
                            className="group flex items-start gap-2 border-b border-border/40 px-3 py-2 last:border-b-0"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <Check className="size-3.5 shrink-0 text-primary" />
                                <span className="text-sm font-medium leading-snug">
                                  {describePermissionName(p.name)}
                                </span>
                              </div>
                              <span className="mt-0.5 block pl-5 font-mono text-[10px] text-muted-foreground">
                                {p.name}
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-7 shrink-0 opacity-60 group-hover:opacity-100"
                              disabled={busy}
                              aria-label={`Retirer ${describePermissionName(p.name)}`}
                              onClick={() => toggle(p.id)}
                            >
                              <X className="size-3.5" />
                            </Button>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 px-4 py-3 backdrop-blur supports-backdrop-filter:bg-background/80">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {changeCount > 0
              ? `${changeCount} modification${changeCount > 1 ? "s" : ""} à enregistrer`
              : "Sélection synchronisée avec la base"}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={busy || changeCount === 0}
              onClick={resetSelection}
            >
              <RotateCcw className="mr-1.5 size-4" />
              Annuler les changements
            </Button>
            <Button
              type="button"
              disabled={busy || changeCount === 0}
              onClick={() => {
                setRootError(null);
                saveMutation.mutate();
              }}
            >
              {saveMutation.isPending
                ? "Enregistrement…"
                : `Enregistrer${changeCount > 0 ? ` (${changeCount})` : ""}`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EditRolePermissionsForm({ roleId }: Props) {
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
    queryKey: ["permission", "assignment"] as const,
    queryFn: async () => {
      const { data } = await api.get<PermissionDto[]>(
        "/permission/for-assignment",
      );
      return data;
    },
    enabled: role !== undefined && !isFullAccessRole(role.name),
  });

  if (roleLoading) {
    return <p className="text-sm text-muted-foreground">Chargement du rôle…</p>;
  }

  if (roleError || !role) {
    return (
      <p className="text-sm text-destructive" role="alert">
        Rôle introuvable ou accès refusé.
      </p>
    );
  }

  if (isFullAccessRole(role.name)) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-5 text-sm text-amber-950">
        <p className="font-semibold">Accès total (système)</p>
        <p className="mt-2 text-amber-900/90">
          Les rôles <span className="font-mono">{role.name}</span> ont un accès
          complet géré par l&apos;application : les permissions en base ne
          s&apos;appliquent pas à ce rôle. Modifiez plutôt les rôles métiers
          personnalisés.
        </p>
      </div>
    );
  }

  if (linksLoading || permsLoading) {
    return (
      <p className="text-sm text-muted-foreground">Chargement des permissions…</p>
    );
  }

  return (
    <EditRolePermissionsFormInner
      key={linksSyncKey(links)}
      roleId={roleId}
      role={role}
      links={links}
      allPermissions={allPermissions}
    />
  );
}
