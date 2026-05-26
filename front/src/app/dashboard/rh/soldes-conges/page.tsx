"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ListPagination } from "../_components/ListPagination";
import { employeeDisplayName } from "../_lib/employee-display";
import { fetchHrAllItems, fetchHrPage } from "../_lib/hr-list";
import { LEAVE_ANNUAL_DAYS, LEAVE_POLICY_SUMMARY } from "../_lib/hr-labels";
import { PageHeader } from "~/components/layout/page-header";
import { PageShell } from "~/components/layout/page-shell";
import { TableScroll } from "~/components/layout/table-scroll";
import { Button } from "~/components/ui/button";
import { hasMePermission, useMe } from "~/hooks/use-me";
import { api } from "~/lib/api";
import type { EmployeeDto, LeaveBalanceDto } from "~/lib/api-types";
import { apiErrorMessage } from "~/lib/api-error-message";

export default function SoldesCongesPage() {
  const queryClient = useQueryClient();
  const { data: me, isPending: mePending } = useMe();
  const canRead = me != null && hasMePermission(me, "read", "LeaveBalance");
  const canCreate = me != null && hasMePermission(me, "create", "LeaveBalance");
  const canUpdate = me != null && hasMePermission(me, "update", "LeaveBalance");
  const canDelete = me != null && hasMePermission(me, "delete", "LeaveBalance");

  const [employeeId, setEmployeeId] = useState("");
  const [page, setPage] = useState(1);
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["hr", "leave-balances", page] as const,
    queryFn: () => fetchHrPage<LeaveBalanceDto>("/hr/leave-balances", { page }),
    enabled: !mePending && canRead,
  });

  const balances = data?.items ?? [];
  const meta = data?.meta;

  const { data: employees = [] } = useQuery({
    queryKey: ["hr", "employees", "picker"] as const,
    queryFn: () => fetchHrAllItems<EmployeeDto>("/hr/employees"),
    enabled: canCreate,
  });

  const ensureMutation = useMutation({
    mutationFn: async () => {
      if (!employeeId) throw new Error("Employé requis");
      await api.post("/hr/leave-balances/ensure", { employeeId });
    },
    onSuccess: async () => {
      setFormError(null);
      await queryClient.invalidateQueries({ queryKey: ["hr", "leave-balances"] });
    },
    onError: (err) => {
      setFormError(
        apiErrorMessage(err, "Impossible d’initialiser le solde de congés"),
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      usedDays,
    }: {
      id: string;
      usedDays: number;
    }) => {
      await api.patch(`/hr/leave-balances/${id}`, { usedDays });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["hr", "leave-balances"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/hr/leave-balances/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["hr", "leave-balances"] });
    },
  });

  return (
    <PageShell>
      <PageHeader
        title="Soldes de congés"
        description={LEAVE_POLICY_SUMMARY}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/rh">RH</Link>
          </Button>
        }
      />

      <p className="mb-4 text-sm text-muted-foreground">
        Chaque exercice ouvre droit à {LEAVE_ANNUAL_DAYS} jours, plus le report
        des jours restants des années précédentes.
      </p>

      {canCreate ? (
        <form
          className="mb-6 flex max-w-2xl flex-wrap items-end gap-3 rounded-xl border border-border bg-muted/20 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            ensureMutation.mutate();
          }}
        >
          <div className="w-full sm:flex-1">
            <label className="mb-1 block text-sm font-medium">Employé *</label>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="h-10 w-full rounded-lg border border-input px-3 text-sm"
            >
              <option value="">— Choisir —</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {employeeDisplayName(e)}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" disabled={ensureMutation.isPending}>
            Ouvrir l’exercice en cours
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
      ) : balances.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun solde enregistré.</p>
      ) : (
        <TableScroll>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 font-semibold">Employé</th>
                <th className="px-4 py-3 font-semibold">Exercice</th>
                <th className="px-4 py-3 font-semibold">Report</th>
                <th className="px-4 py-3 font-semibold">Utilisé / Total</th>
                <th className="px-4 py-3 font-semibold">Reste</th>
                {(canUpdate || canDelete) && (
                  <th className="px-4 py-3 font-semibold">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {balances.map((b) => (
                <tr key={b.id} className="border-b border-border/60">
                  <td className="px-4 py-3 font-medium">
                    {employeeDisplayName(b.employee)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {b.periodLabel}
                  </td>
                  <td className="px-4 py-3">
                    {b.carriedOverDays > 0 ? `+${b.carriedOverDays} j` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {b.usedDays} / {b.totalDays}
                    <span className="ml-1 text-muted-foreground">
                      ({LEAVE_ANNUAL_DAYS} j/an)
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {b.remainingDays} j
                  </td>
                  {canUpdate || canDelete ? (
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {canUpdate ? (
                          <button
                            type="button"
                            className="text-xs text-orange-700 hover:underline"
                            onClick={() => {
                              const u = window.prompt(
                                "Jours utilisés (correction manuelle)",
                                String(b.usedDays),
                              );
                              if (u == null) return;
                              updateMutation.mutate({
                                id: b.id,
                                usedDays: Number(u),
                              });
                            }}
                          >
                            Corriger utilisés
                          </button>
                        ) : null}
                        {canDelete ? (
                          <button
                            type="button"
                            className="text-xs text-destructive hover:underline"
                            onClick={() => {
                              if (window.confirm("Supprimer ce solde ?")) {
                                deleteMutation.mutate(b.id);
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
        </TableScroll>
      )}
      {meta ? (
        <ListPagination meta={meta} onPageChange={setPage} className="mt-4" />
      ) : null}
    </PageShell>
  );
}
