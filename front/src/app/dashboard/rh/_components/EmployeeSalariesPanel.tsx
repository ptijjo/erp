"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { dateInputToIso, isoToDateInput } from "../_lib/date-input";
import { ListPagination } from "./ListPagination";
import { fetchHrPage } from "../_lib/hr-list";
import { api } from "~/lib/api";
import type { EmployeeSalaryDto } from "~/lib/api-types";
import { apiErrorMessage } from "~/lib/api-error-message";
import { formatFcfa } from "~/lib/format-fcfa";
import { parseDecimal } from "~/lib/parse-decimal";
import { hasMePermission, useMe } from "~/hooks/use-me";

type Props = { employeeId: string };

export function EmployeeSalariesPanel({ employeeId }: Props) {
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  const canRead = me != null && hasMePermission(me, "read", "EmployeeSalary");
  const canCreate = me != null && hasMePermission(me, "create", "EmployeeSalary");
  const canDelete = me != null && hasMePermission(me, "delete", "EmployeeSalary");

  const [amount, setAmount] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [effectiveTo, setEffectiveTo] = useState("");
  const [label, setLabel] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const { data: salariesPage, isLoading } = useQuery({
    queryKey: ["hr", "salaries", employeeId, page] as const,
    queryFn: () =>
      fetchHrPage<EmployeeSalaryDto>("/hr/salaries", {
        page,
        employeeId,
      }),
    enabled: canRead,
  });

  const salaries = salariesPage?.items ?? [];
  const meta = salariesPage?.meta;

  const createMutation = useMutation({
    mutationFn: async () => {
      const parsed = parseDecimal(amount);
      if (parsed <= 0) throw new Error("Montant invalide");
      if (!effectiveFrom) throw new Error("Date de début requise");
      await api.post("/hr/salaries", {
        employeeId,
        amount: parsed,
        effectiveFrom: dateInputToIso(effectiveFrom),
        effectiveTo: effectiveTo ? dateInputToIso(effectiveTo) : undefined,
        label: label.trim() || undefined,
      });
    },
    onSuccess: async () => {
      setFormError(null);
      setAmount("");
      setEffectiveFrom("");
      setEffectiveTo("");
      setLabel("");
      await queryClient.invalidateQueries({ queryKey: ["hr", "salaries"] });
    },
    onError: (err) => {
      setFormError(apiErrorMessage(err, "Impossible d’ajouter le salaire"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/hr/salaries/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["hr", "salaries"] });
    },
  });

  if (!canRead) return null;

  return (
    <section className="rounded-xl border border-border p-4">
      <h3 className="text-lg font-semibold">Rémunération</h3>
      {isLoading ? (
        <p className="mt-2 text-sm text-muted-foreground">Chargement…</p>
      ) : salaries.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Aucun salaire enregistré.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {salaries.map((s) => (
            <li
              key={s.id}
              className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm"
            >
              <div>
                <p className="font-medium">{formatFcfa(parseDecimal(s.amount))}</p>
                <p className="text-muted-foreground">
                  {isoToDateInput(s.effectiveFrom)}
                  {s.effectiveTo ? ` → ${isoToDateInput(s.effectiveTo)}` : " (en cours)"}
                </p>
                {s.label ? (
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                ) : null}
              </div>
              {canDelete ? (
                <button
                  type="button"
                  className="text-xs text-destructive hover:underline"
                  onClick={() => {
                    if (window.confirm("Supprimer cette ligne de salaire ?")) {
                      deleteMutation.mutate(s.id);
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
            <label className="mb-1 block text-xs font-medium">Montant (FCFA) *</label>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-9 w-full rounded-md border border-input px-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Libellé</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="h-9 w-full rounded-md border border-input px-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Valide à partir de *</label>
            <input
              type="date"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
              className="h-9 w-full rounded-md border border-input px-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Valide jusqu’au</label>
            <input
              type="date"
              value={effectiveTo}
              onChange={(e) => setEffectiveTo(e.target.value)}
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
              Ajouter un salaire
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
