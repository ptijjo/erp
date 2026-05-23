"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { dateInputToIso, isoToDateInput } from "../_lib/date-input";
import {
  CONTRACT_STATUS_LABEL,
  CONTRACT_STATUS_OPTIONS,
  CONTRACT_TYPE_LABEL,
  CONTRACT_TYPE_OPTIONS,
} from "../_lib/hr-labels";
import { ListPagination } from "./ListPagination";
import { fetchHrPage } from "../_lib/hr-list";
import { api } from "~/lib/api";
import type { EmploymentContractDto } from "~/lib/api-types";
import { apiErrorMessage } from "~/lib/api-error-message";
import { hasMePermission, useMe } from "~/hooks/use-me";

type Props = { employeeId: string };

export function EmployeeContractsPanel({ employeeId }: Props) {
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  const canRead =
    me != null && hasMePermission(me, "read", "EmploymentContract");
  const canCreate =
    me != null && hasMePermission(me, "create", "EmploymentContract");
  const canDelete =
    me != null && hasMePermission(me, "delete", "EmploymentContract");

  const [type, setType] = useState<EmploymentContractDto["type"]>("CDI");
  const [status, setStatus] =
    useState<EmploymentContractDto["status"]>("ACTIVE");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const { data: contractsPage, isLoading } = useQuery({
    queryKey: ["hr", "contracts", employeeId, page] as const,
    queryFn: () =>
      fetchHrPage<EmploymentContractDto>("/hr/contracts", {
        page,
        employeeId,
      }),
    enabled: canRead,
  });

  const contracts = contractsPage?.items ?? [];
  const meta = contractsPage?.meta;

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!startDate) throw new Error("Date de début requise");
      await api.post("/hr/contracts", {
        employeeId,
        type,
        status,
        startDate: dateInputToIso(startDate),
        endDate: endDate ? dateInputToIso(endDate) : undefined,
        note: note.trim() || undefined,
      });
    },
    onSuccess: async () => {
      setFormError(null);
      setStartDate("");
      setEndDate("");
      setNote("");
      await queryClient.invalidateQueries({ queryKey: ["hr", "contracts"] });
    },
    onError: (err) => {
      setFormError(apiErrorMessage(err, "Impossible d’ajouter le contrat"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/hr/contracts/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["hr", "contracts"] });
    },
  });

  if (!canRead) return null;

  return (
    <section className="rounded-xl border border-border p-4">
      <h3 className="text-lg font-semibold">Contrats</h3>
      {isLoading ? (
        <p className="mt-2 text-sm text-muted-foreground">Chargement…</p>
      ) : contracts.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Aucun contrat.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {contracts.map((c) => (
            <li
              key={c.id}
              className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm"
            >
              <div>
                <p className="font-medium">
                  {CONTRACT_TYPE_LABEL[c.type]} ·{" "}
                  {CONTRACT_STATUS_LABEL[c.status]}
                </p>
                <p className="text-muted-foreground">
                  {isoToDateInput(c.startDate)}
                  {c.endDate ? ` → ${isoToDateInput(c.endDate)}` : ""}
                </p>
                {c.note ? (
                  <p className="text-xs text-muted-foreground">{c.note}</p>
                ) : null}
              </div>
              {canDelete ? (
                <button
                  type="button"
                  className="text-xs text-destructive hover:underline"
                  onClick={() => {
                    if (window.confirm("Supprimer ce contrat ?")) {
                      deleteMutation.mutate(c.id);
                    }
                  }}
                >
                  Supprimer
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {meta ? (
        <ListPagination
          meta={meta}
          onPageChange={setPage}
          className="mt-3 border-t-0 pt-0"
        />
      ) : null}

      {canCreate ? (
        <form
          className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
        >
          <div>
            <label className="mb-1 block text-xs font-medium">Type</label>
            <select
              value={type}
              onChange={(e) =>
                setType(e.target.value as EmploymentContractDto["type"])
              }
              className="h-9 w-full rounded-md border border-input px-2 text-sm"
            >
              {CONTRACT_TYPE_OPTIONS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Statut</label>
            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as EmploymentContractDto["status"])
              }
              className="h-9 w-full rounded-md border border-input px-2 text-sm"
            >
              {CONTRACT_STATUS_OPTIONS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Début *</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-9 w-full rounded-md border border-input px-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Fin</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-9 w-full rounded-md border border-input px-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium">Note</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="h-9 w-full rounded-md border border-input px-2 text-sm"
            />
          </div>
          {formError ? (
            <p className="sm:col-span-2 text-sm text-destructive">{formError}</p>
          ) : null}
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Ajouter un contrat
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
