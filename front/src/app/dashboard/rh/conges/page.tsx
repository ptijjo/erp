"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ListPagination } from "../_components/ListPagination";
import { employeeDisplayName } from "../_lib/employee-display";
import { fetchHrAllItems, fetchHrPage } from "../_lib/hr-list";
import { dateInputToIso, isoToDateInput } from "../_lib/date-input";
import { LEAVE_STATUS_LABEL, LEAVE_TYPE_LABEL, LEAVE_TYPE_OPTIONS } from "../_lib/hr-labels";
import { PageHeader } from "~/components/layout/page-header";
import { PageShell } from "~/components/layout/page-shell";
import { TableScroll } from "~/components/layout/table-scroll";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { hasMePermission, useMe } from "~/hooks/use-me";
import { api } from "~/lib/api";
import type { EmployeeDto, LeaveRequestDto, LeaveTypeDto } from "~/lib/api-types";
import { apiErrorMessage } from "~/lib/api-error-message";

export default function CongesPage() {
  const queryClient = useQueryClient();
  const { data: me, isPending: mePending } = useMe();
  const canRead = me != null && hasMePermission(me, "read", "LeaveRequest");
  const canCreate = me != null && hasMePermission(me, "create", "LeaveRequest");
  const canUpdate = me != null && hasMePermission(me, "update", "LeaveRequest");
  const canDelete = me != null && hasMePermission(me, "delete", "LeaveRequest");

  const [employeeId, setEmployeeId] = useState("");
  const [leaveType, setLeaveType] = useState<LeaveTypeDto>("PAID_LEAVE");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [page, setPage] = useState(1);
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["hr", "leave-requests", page] as const,
    queryFn: () => fetchHrPage<LeaveRequestDto>("/hr/leave-requests", { page }),
    enabled: !mePending && canRead,
  });

  const requests = data?.items ?? [];
  const meta = data?.meta;

  const { data: employees = [] } = useQuery({
    queryKey: ["hr", "employees", "picker"] as const,
    queryFn: () => fetchHrAllItems<EmployeeDto>("/hr/employees"),
    enabled: canCreate,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!employeeId || !startDate || !endDate) {
        throw new Error("Employé et dates requis");
      }
      await api.post("/hr/leave-requests", {
        employeeId,
        startDate: dateInputToIso(startDate),
        endDate: dateInputToIso(endDate),
        reason: reason.trim() || undefined,
        type: leaveType,
      });
    },
    onSuccess: async () => {
      setFormError(null);
      setStartDate("");
      setEndDate("");
      setReason("");
      await queryClient.invalidateQueries({ queryKey: ["hr", "leave-requests"] });
    },
    onError: (err) => {
      setFormError(apiErrorMessage(err, "Impossible de créer la demande"));
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: "APPROVED" | "REJECTED" | "CANCELLED";
    }) => {
      await api.patch(`/hr/leave-requests/${id}/status`, { status });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["hr", "leave-requests"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/hr/leave-requests/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["hr", "leave-requests"] });
    },
  });

  return (
    <PageShell>
      <PageHeader
        title="Demandes de congé"
        description="Demandes, validations et refus."
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
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {employeeDisplayName(e)}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">Type *</label>
            <select
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value as LeaveTypeDto)}
              className="h-10 w-full rounded-lg border border-input px-3 text-sm"
            >
              {LEAVE_TYPE_OPTIONS.map(([value, label]) => (
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
            <label className="mb-1 block text-sm font-medium">Fin *</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-10 w-full rounded-lg border border-input px-3 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">Motif</label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="h-10 w-full rounded-lg border border-input px-3 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={createMutation.isPending}>
              Nouvelle demande
            </Button>
          </div>
          {formError ? (
            <p className="sm:col-span-2 text-sm text-destructive">{formError}</p>
          ) : null}
        </form>
      ) : null}

      {isError ? (
        <p className="text-sm text-destructive">Chargement impossible.</p>
      ) : isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : requests.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune demande.</p>
      ) : (
        <TableScroll>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 font-semibold">Employé</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Période</th>
                <th className="px-4 py-3 font-semibold">Statut</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-b border-border/60">
                  <td className="px-4 py-3 font-medium">
                    {employeeDisplayName(r.employee)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {LEAVE_TYPE_LABEL[r.type]}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {isoToDateInput(r.startDate)} → {isoToDateInput(r.endDate)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        r.status === "APPROVED"
                          ? "default"
                          : r.status === "PENDING"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {LEAVE_STATUS_LABEL[r.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {canUpdate && r.status === "PENDING" ? (
                        <>
                          <button
                            type="button"
                            className="text-xs font-medium text-green-700 hover:underline"
                            onClick={() =>
                              statusMutation.mutate({
                                id: r.id,
                                status: "APPROVED",
                              })
                            }
                          >
                            Approuver
                          </button>
                          <button
                            type="button"
                            className="text-xs font-medium text-red-700 hover:underline"
                            onClick={() =>
                              statusMutation.mutate({
                                id: r.id,
                                status: "REJECTED",
                              })
                            }
                          >
                            Refuser
                          </button>
                          <button
                            type="button"
                            className="text-xs text-muted-foreground hover:underline"
                            onClick={() =>
                              statusMutation.mutate({
                                id: r.id,
                                status: "CANCELLED",
                              })
                            }
                          >
                            Annuler
                          </button>
                        </>
                      ) : null}
                      {canDelete ? (
                        <button
                          type="button"
                          className="text-xs text-destructive hover:underline"
                          onClick={() => {
                            if (window.confirm("Supprimer cette demande ?")) {
                              deleteMutation.mutate(r.id);
                            }
                          }}
                        >
                          Supprimer
                        </button>
                      ) : null}
                    </div>
                  </td>
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
