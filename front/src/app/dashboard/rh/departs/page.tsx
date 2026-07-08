"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ListPagination } from "../_components/ListPagination";
import { employeeDisplayName } from "../_lib/employee-display";
import { fetchHrAllItems, fetchHrPage } from "../_lib/hr-list";
import { dateInputToIso, isoToDateInput } from "../_lib/date-input";
import {
  DEPARTURE_REASON_LABEL,
  DEPARTURE_REASON_OPTIONS,
} from "../_lib/hr-labels";
import { PageHeader } from "~/components/layout/page-header";
import { PageShell } from "~/components/layout/page-shell";
import { TableScroll } from "~/components/layout/table-scroll";
import { Button } from "~/components/ui/button";
import { hasMePermission, useMe } from "~/hooks/use-me";
import { api } from "~/lib/api";
import type {
  EmployeeDepartureDto,
  EmployeeDepartureReasonDto,
  EmployeeDto,
} from "~/lib/api-types";
import { apiErrorMessage } from "~/lib/api-error-message";

export default function DepartsPage() {
  const queryClient = useQueryClient();
  const { data: me, isPending: mePending } = useMe();

  const canRead = me != null && hasMePermission(me, "read", "EmployeeDeparture");
  const canCreate =
    me != null && hasMePermission(me, "create", "EmployeeDeparture");
  const canUpdate =
    me != null && hasMePermission(me, "update", "EmployeeDeparture");
  const canDelete =
    me != null && hasMePermission(me, "delete", "EmployeeDeparture");

  const [employeeId, setEmployeeId] = useState("");
  const [reason, setReason] = useState<EmployeeDepartureReasonDto>("RESIGNATION");
  const [departureDate, setDepartureDate] = useState("");
  const [note, setNote] = useState("");
  const [page, setPage] = useState(1);
  const [formError, setFormError] = useState<string | null>(null);

  const [editId, setEditId] = useState<string | null>(null);
  const [editReason, setEditReason] =
    useState<EmployeeDepartureReasonDto>("RESIGNATION");
  const [editDate, setEditDate] = useState("");
  const [editNote, setEditNote] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["hr", "departures", page] as const,
    queryFn: () => fetchHrPage<EmployeeDepartureDto>("/hr/departures", { page }),
    enabled: !mePending && canRead,
  });

  const departures = data?.items ?? [];
  const meta = data?.meta;

  const { data: employees = [] } = useQuery({
    queryKey: ["hr", "employees", "picker", "active"] as const,
    queryFn: () =>
      fetchHrAllItems<EmployeeDto>("/hr/employees", { status: "ACTIVE" }),
    enabled: canCreate,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!employeeId || !departureDate) {
        throw new Error("Employé et date de départ requis");
      }
      await api.post("/hr/departures", {
        employeeId,
        reason,
        departureDate: dateInputToIso(departureDate),
        note: note.trim() || undefined,
      });
    },
    onSuccess: async () => {
      setFormError(null);
      setEmployeeId("");
      setDepartureDate("");
      setNote("");
      await queryClient.invalidateQueries({ queryKey: ["hr", "departures"] });
      await queryClient.invalidateQueries({ queryKey: ["hr", "employees"] });
    },
    onError: (err) => {
      setFormError(apiErrorMessage(err, "Impossible d’enregistrer le départ"));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/hr/departures/${id}`, {
        reason: editReason,
        departureDate: dateInputToIso(editDate),
        note: editNote.trim() || undefined,
      });
    },
    onSuccess: async () => {
      setEditId(null);
      await queryClient.invalidateQueries({ queryKey: ["hr", "departures"] });
      await queryClient.invalidateQueries({ queryKey: ["hr", "employees"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/hr/departures/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["hr", "departures"] });
      await queryClient.invalidateQueries({ queryKey: ["hr", "employees"] });
    },
  });

  function beginEdit(d: EmployeeDepartureDto) {
    setEditId(d.id);
    setEditReason(d.reason);
    setEditDate(isoToDateInput(d.departureDate));
    setEditNote(d.note ?? "");
  }

  const inputCls = "h-9 w-full rounded-lg border border-input px-2 text-sm";

  return (
    <PageShell>
      <PageHeader
        title="Départs"
        description="Sorties d’effectif et fins de collaboration."
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
          <div>
            <label className="mb-1 block text-sm font-medium">Motif *</label>
            <select
              value={reason}
              onChange={(e) =>
                setReason(e.target.value as EmployeeDepartureReasonDto)
              }
              className="h-10 w-full rounded-lg border border-input px-3 text-sm"
            >
              {DEPARTURE_REASON_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              Date de départ *
            </label>
            <input
              type="date"
              value={departureDate}
              onChange={(e) => setDepartureDate(e.target.value)}
              className="h-10 w-full rounded-lg border border-input px-3 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">Note</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="h-10 w-full rounded-lg border border-input px-3 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={createMutation.isPending}>
              Enregistrer le départ
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
          Vous n’avez pas la permission de consulter les départs.
        </p>
      ) : departures.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun départ enregistré.</p>
      ) : (
        <TableScroll>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 font-semibold">Employé</th>
                <th className="px-4 py-3 font-semibold">Motif</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Note</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {departures.map((d) =>
                editId === d.id ? (
                  <tr key={d.id} className="border-b border-border/60">
                    <td className="px-4 py-3 font-medium">
                      {employeeDisplayName(d.employee)}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={editReason}
                        onChange={(e) =>
                          setEditReason(
                            e.target.value as EmployeeDepartureReasonDto,
                          )
                        }
                        className={inputCls}
                      >
                        {DEPARTURE_REASON_OPTIONS.map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className={inputCls}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        value={editNote}
                        onChange={(e) => setEditNote(e.target.value)}
                        className={inputCls}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="text-xs font-medium text-green-700 hover:underline"
                          onClick={() => updateMutation.mutate(d.id)}
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
                  <tr key={d.id} className="border-b border-border/60">
                    <td className="px-4 py-3 font-medium">
                      {employeeDisplayName(d.employee)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {DEPARTURE_REASON_LABEL[d.reason]}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {isoToDateInput(d.departureDate)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {d.note ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {canUpdate ? (
                          <button
                            type="button"
                            className="text-xs font-medium text-orange-700 hover:underline"
                            onClick={() => beginEdit(d)}
                          >
                            Modifier
                          </button>
                        ) : null}
                        {canDelete ? (
                          <button
                            type="button"
                            className="text-xs text-destructive hover:underline"
                            onClick={() => {
                              if (
                                window.confirm(
                                  "Supprimer ce départ et réactiver l’employé ?",
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
