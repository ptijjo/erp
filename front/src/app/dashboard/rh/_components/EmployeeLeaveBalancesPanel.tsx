"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchHrAllItems } from "../_lib/hr-list";
import { LEAVE_ANNUAL_DAYS, LEAVE_POLICY_SUMMARY } from "../_lib/hr-labels";
import { api } from "~/lib/api";
import type { LeaveBalanceDto } from "~/lib/api-types";
import { apiErrorMessage } from "~/lib/api-error-message";
import { hasMePermission, useMe } from "~/hooks/use-me";

type Props = { employeeId: string };

export function EmployeeLeaveBalancesPanel({ employeeId }: Props) {
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  const canRead = me != null && hasMePermission(me, "read", "LeaveBalance");
  const canCreate = me != null && hasMePermission(me, "create", "LeaveBalance");
  const canUpdate = me != null && hasMePermission(me, "update", "LeaveBalance");
  const canDelete = me != null && hasMePermission(me, "delete", "LeaveBalance");

  const { data: balances = [], isLoading } = useQuery({
    queryKey: ["hr", "leave-balances", employeeId] as const,
    queryFn: () =>
      fetchHrAllItems<LeaveBalanceDto>("/hr/leave-balances", { employeeId }),
    enabled: canRead,
  });

  const ensureMutation = useMutation({
    mutationFn: async () => {
      await api.post("/hr/leave-balances/ensure", { employeeId });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["hr", "leave-balances", employeeId],
      });
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
      await queryClient.invalidateQueries({
        queryKey: ["hr", "leave-balances", employeeId],
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/hr/leave-balances/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["hr", "leave-balances", employeeId],
      });
    },
  });

  if (!canRead) return null;

  return (
    <section className="rounded-xl border border-border p-4">
      <h3 className="text-lg font-semibold">Soldes de congés</h3>
      <p className="mt-1 text-sm text-muted-foreground">{LEAVE_POLICY_SUMMARY}</p>

      {canCreate ? (
        <div className="mt-3">
          <button
            type="button"
            className="rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            disabled={ensureMutation.isPending}
            onClick={() => ensureMutation.mutate()}
          >
            Ouvrir l’exercice en cours (mai)
          </button>
          {ensureMutation.isError ? (
            <p className="mt-2 text-sm text-destructive">
              {apiErrorMessage(
                ensureMutation.error,
                "Impossible d’ouvrir l’exercice",
              )}
            </p>
          ) : null}
        </div>
      ) : null}

      {isLoading ? (
        <p className="mt-2 text-sm text-muted-foreground">Chargement…</p>
      ) : balances.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Aucun exercice ouvert. Utilisez le bouton ci-dessus.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {balances.map((b) => (
            <li
              key={b.id}
              className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm"
            >
              <p className="font-medium">{b.periodLabel}</p>
              <p className="text-muted-foreground">
                {b.usedDays} / {b.totalDays} j utilisés
                {b.carriedOverDays > 0
                  ? ` (dont +${b.carriedOverDays} j reportés, ${LEAVE_ANNUAL_DAYS} j/an)`
                  : ` (${LEAVE_ANNUAL_DAYS} j/an)`}
              </p>
              <p className="font-medium text-foreground">
                Reste : {b.remainingDays} j
              </p>
              {canUpdate || canDelete ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {canUpdate ? (
                    <button
                      type="button"
                      className="text-xs text-orange-700 hover:underline"
                      onClick={() => {
                        const u = window.prompt(
                          "Jours utilisés (correction)",
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
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
