"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ListPagination } from "../_components/ListPagination";
import { employeeDisplayName } from "../_lib/employee-display";
import { fetchHrAllItems, fetchHrPage } from "../_lib/hr-list";
import { dateInputToIso, isoToDateInput } from "../_lib/date-input";
import {
  SANCTION_TYPE_LABEL,
  SANCTION_TYPE_OPTIONS,
} from "../_lib/hr-labels";
import { PageHeader } from "~/components/layout/page-header";
import { PageShell } from "~/components/layout/page-shell";
import { TableScroll } from "~/components/layout/table-scroll";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { hasMePermission, useMe } from "~/hooks/use-me";
import { api } from "~/lib/api";
import type {
  EmployeeDto,
  EmployeeSanctionDto,
  EmployeeSanctionTypeDto,
} from "~/lib/api-types";
import { apiErrorMessage } from "~/lib/api-error-message";

export default function SanctionsPage() {
  const queryClient = useQueryClient();
  const { data: me, isPending: mePending } = useMe();

  const canRead = me != null && hasMePermission(me, "read", "EmployeeSanction");
  const canCreate =
    me != null && hasMePermission(me, "create", "EmployeeSanction");
  const canUpdate =
    me != null && hasMePermission(me, "update", "EmployeeSanction");
  const canDelete =
    me != null && hasMePermission(me, "delete", "EmployeeSanction");

  const [employeeId, setEmployeeId] = useState("");
  const [type, setType] = useState<EmployeeSanctionTypeDto>("WARNING");
  const [reason, setReason] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [formError, setFormError] = useState<string | null>(null);

  const [editId, setEditId] = useState<string | null>(null);
  const [editType, setEditType] = useState<EmployeeSanctionTypeDto>("WARNING");
  const [editReason, setEditReason] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["hr", "sanctions", page] as const,
    queryFn: () => fetchHrPage<EmployeeSanctionDto>("/hr/sanctions", { page }),
    enabled: !mePending && canRead,
  });

  const sanctions = data?.items ?? [];
  const meta = data?.meta;

  const { data: employees = [] } = useQuery({
    queryKey: ["hr", "employees", "picker"] as const,
    queryFn: () => fetchHrAllItems<EmployeeDto>("/hr/employees"),
    enabled: canCreate,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!employeeId || !reason.trim() || !startDate) {
        throw new Error("Employé, motif et date de début requis");
      }
      await api.post("/hr/sanctions", {
        employeeId,
        type,
        reason: reason.trim(),
        startDate: dateInputToIso(startDate),
        endDate: endDate ? dateInputToIso(endDate) : undefined,
      });
    },
    onSuccess: async () => {
      setFormError(null);
      setReason("");
      setStartDate("");
      setEndDate("");
      await queryClient.invalidateQueries({ queryKey: ["hr", "sanctions"] });
      await queryClient.invalidateQueries({ queryKey: ["hr", "employees"] });
    },
    onError: (err) => {
      setFormError(apiErrorMessage(err, "Impossible d’enregistrer la sanction"));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/hr/sanctions/${id}`, {
        type: editType,
        reason: editReason.trim(),
        startDate: dateInputToIso(editStart),
        endDate: editEnd ? dateInputToIso(editEnd) : undefined,
      });
    },
    onSuccess: async () => {
      setEditId(null);
      await queryClient.invalidateQueries({ queryKey: ["hr", "sanctions"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/hr/sanctions/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["hr", "sanctions"] });
    },
  });

  function beginEdit(s: EmployeeSanctionDto) {
    setEditId(s.id);
    setEditType(s.type);
    setEditReason(s.reason);
    setEditStart(isoToDateInput(s.startDate));
    setEditEnd(s.endDate ? isoToDateInput(s.endDate) : "");
  }

  const inputCls = "h-9 w-full rounded-lg border border-input px-2 text-sm";

  return (
    <PageShell>
      <PageHeader
        title="Sanctions"
        description="Avertissements, mises à pied et sanctions disciplinaires."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/rh">RH</Link>
          </Button>
        }
      />

      {canCreate ? (
        <form
          className="mb-6 grid max-w-2xl gap-3 rounded-xl border border-border bg-muted/20 p-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
        >
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">Employé *</label>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="h-10 w-full rounded-lg border border-input px-3 text-sm"
            >
              <option value="">— Choisir —</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {employeeDisplayName(emp)}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">Type *</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as EmployeeSanctionTypeDto)}
              className="h-10 w-full rounded-lg border border-input px-3 text-sm"
            >
              {SANCTION_TYPE_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Début *</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-10 w-full rounded-lg border border-input px-3 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              Fin (mise à pied)
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-10 w-full rounded-lg border border-input px-3 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">Motif *</label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="h-10 w-full rounded-lg border border-input px-3 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={createMutation.isPending}>
              Enregistrer la sanction
            </Button>
          </div>
          {formError ? (
            <p className="text-sm text-destructive sm:col-span-2">{formError}</p>
          ) : null}
        </form>
      ) : null}

      {isError ? (
        <p className="text-sm text-destructive">Chargement impossible.</p>
      ) : isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : !canRead ? (
        <p className="text-sm text-amber-800" role="alert">
          Vous n’avez pas la permission de consulter les sanctions.
        </p>
      ) : sanctions.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune sanction.</p>
      ) : (
        <TableScroll>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 font-semibold">Employé</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Période</th>
                <th className="px-4 py-3 font-semibold">Motif</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sanctions.map((s) =>
                editId === s.id ? (
                  <tr key={s.id} className="border-b border-border/60">
                    <td className="px-4 py-3 font-medium">
                      {employeeDisplayName(s.employee)}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={editType}
                        onChange={(e) =>
                          setEditType(e.target.value as EmployeeSanctionTypeDto)
                        }
                        className={inputCls}
                      >
                        {SANCTION_TYPE_OPTIONS.map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <input
                          type="date"
                          value={editStart}
                          onChange={(e) => setEditStart(e.target.value)}
                          className={inputCls}
                        />
                        <input
                          type="date"
                          value={editEnd}
                          onChange={(e) => setEditEnd(e.target.value)}
                          className={inputCls}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        value={editReason}
                        onChange={(e) => setEditReason(e.target.value)}
                        className={inputCls}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="text-xs font-medium text-green-700 hover:underline"
                          onClick={() => updateMutation.mutate(s.id)}
                        >
                          Enregistrer
                        </button>
                        <button
                          type="button"
                          className="text-xs text-muted-foreground hover:underline"
                          onClick={() => setEditId(null)}
                        >
                          Annuler
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={s.id} className="border-b border-border/60">
                    <td className="px-4 py-3 font-medium">
                      {employeeDisplayName(s.employee)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          s.type === "LAYOFF"
                            ? "destructive"
                            : s.type === "SUSPENSION"
                              ? "default"
                              : "secondary"
                        }
                      >
                        {SANCTION_TYPE_LABEL[s.type]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {isoToDateInput(s.startDate)}
                      {s.endDate ? ` → ${isoToDateInput(s.endDate)}` : ""}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {s.reason}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {canUpdate ? (
                          <button
                            type="button"
                            className="text-xs font-medium text-orange-700 hover:underline"
                            onClick={() => beginEdit(s)}
                          >
                            Modifier
                          </button>
                        ) : null}
                        {canDelete ? (
                          <button
                            type="button"
                            className="text-xs text-destructive hover:underline"
                            onClick={() => {
                              if (window.confirm("Supprimer cette sanction ?")) {
                                deleteMutation.mutate(s.id);
                              }
                            }}
                          >
                            Supprimer
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ),
              )}
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
