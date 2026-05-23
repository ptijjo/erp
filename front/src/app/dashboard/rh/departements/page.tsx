"use client";

import { useState } from "react";
import { ListPagination } from "../_components/ListPagination";
import { fetchHrPage } from "../_lib/hr-list";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Plus } from "lucide-react";

import { PageHeader } from "~/components/layout/page-header";
import { PageShell } from "~/components/layout/page-shell";
import { Button } from "~/components/ui/button";
import {
  hasMePermission,
  isMainOrganization,
  useMe,
} from "~/hooks/use-me";
import { api } from "~/lib/api";
import type { DepartmentDto, OrganizationDto } from "~/lib/api-types";
import { apiErrorMessage } from "~/lib/api-error-message";

export default function DepartementsPage() {
  const queryClient = useQueryClient();
  const { data: me, isPending: mePending } = useMe();
  const canRead = me != null && hasMePermission(me, "read", "Department");
  const canCreate = me != null && hasMePermission(me, "create", "Department");
  const canUpdate = me != null && hasMePermission(me, "update", "Department");
  const canDelete = me != null && hasMePermission(me, "delete", "Department");
  const isMain = me != null && isMainOrganization(me);

  const [page, setPage] = useState(1);
  const [name, setName] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["hr", "departments", page] as const,
    queryFn: () => fetchHrPage<DepartmentDto>("/hr/departments", { page }),
    enabled: !mePending && canRead,
  });

  const departments = data?.items ?? [];
  const meta = data?.meta;

  const { data: organisations = [] } = useQuery({
    queryKey: ["organisation"] as const,
    queryFn: async () => {
      const { data } = await api.get<OrganizationDto[]>("/organisation");
      return data;
    },
    enabled: isMain && canCreate,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload: { name: string; organizationId?: string } = {
        name: name.trim(),
      };
      if (isMain && organizationId) payload.organizationId = organizationId;
      await api.post("/hr/departments", payload);
    },
    onSuccess: async () => {
      setName("");
      setFormError(null);
      await queryClient.invalidateQueries({ queryKey: ["hr", "departments"] });
    },
    onError: (err) => {
      setFormError(apiErrorMessage(err, "Impossible de créer le département"));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, newName }: { id: string; newName: string }) => {
      await api.patch(`/hr/departments/${id}`, { name: newName.trim() });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["hr", "departments"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/hr/departments/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["hr", "departments"] });
    },
  });

  return (
    <PageShell>
      <PageHeader
        title="Départements"
        description="Services et unités au sein de chaque organisation."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/rh">RH</Link>
          </Button>
        }
      />

      {canCreate ? (
        <form
          className="mb-6 flex max-w-lg flex-wrap items-end gap-3 rounded-xl border border-border bg-muted/20 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            createMutation.mutate();
          }}
        >
          <div className="min-w-[200px] flex-1">
            <label className="mb-1 block text-sm font-medium">Nom *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 w-full rounded-lg border border-input px-3 text-sm"
              placeholder="Ex. Finance"
            />
          </div>
          {isMain ? (
            <div className="min-w-[200px] flex-1">
              <label className="mb-1 block text-sm font-medium">
                Organisation
              </label>
              <select
                value={organizationId}
                onChange={(e) => setOrganizationId(e.target.value)}
                className="h-10 w-full rounded-lg border border-input px-3 text-sm"
              >
                <option value="">— Par défaut —</option>
                {organisations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <Button type="submit" disabled={createMutation.isPending}>
            <Plus className="size-4" />
            Ajouter
          </Button>
          {formError ? (
            <p className="w-full text-sm text-destructive">{formError}</p>
          ) : null}
        </form>
      ) : null}

      {isError ? (
        <p className="text-sm text-destructive">Chargement impossible.</p>
      ) : isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : departments.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Building2 className="size-4" />
          Aucun département.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 font-semibold">Nom</th>
                {canUpdate || canDelete ? (
                  <th className="px-4 py-3 font-semibold">Actions</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {departments.map((d) => (
                <tr key={d.id} className="border-b border-border/60">
                  <td className="px-4 py-3 font-medium">{d.name}</td>
                  {canUpdate || canDelete ? (
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        {canUpdate ? (
                          <button
                            type="button"
                            className="text-sm text-orange-700 hover:underline"
                            onClick={() => {
                              const n = window.prompt("Nouveau nom", d.name);
                              if (n?.trim()) {
                                updateMutation.mutate({
                                  id: d.id,
                                  newName: n,
                                });
                              }
                            }}
                          >
                            Renommer
                          </button>
                        ) : null}
                        {canDelete ? (
                          <button
                            type="button"
                            className="text-sm text-destructive hover:underline"
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Supprimer le département « ${d.name} » ?`,
                                )
                              ) {
                                deleteMutation.mutate(d.id);
                              }
                            }}
                          >
                            Supprimer
                          </button>
                        ) : null}
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {meta ? (
        <ListPagination meta={meta} onPageChange={setPage} className="mt-4" />
      ) : null}
    </PageShell>
  );
}
