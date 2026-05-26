"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  MONTHS_FR,
  SUPPLEMENT_STATUS_LABEL,
} from "~/app/dashboard/budgets/_lib/budget-constants";
import {
  canProposeBudget,
  isBudgetFinalApprover,
} from "~/app/dashboard/budgets/_lib/budget-workflow";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import {
  hasMePermission,
  isMainOrganization,
  useMe,
} from "~/hooks/use-me";
import { api } from "~/lib/api";
import type { BudgetDto, BudgetSupplementRequestDto } from "~/lib/api-types";
import { formatFcfa } from "~/lib/format-fcfa";
import { parseDecimal } from "~/lib/parse-decimal";
import { apiErrorMessage } from "~/lib/api-error-message";

type BudgetSupplementPanelProps = {
  budgets: BudgetDto[];
};

export function BudgetSupplementPanel({ budgets }: BudgetSupplementPanelProps) {
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  const isMain = me != null && isMainOrganization(me);
  const canRead =
    me != null && hasMePermission(me, "read", "BudgetSupplementRequest");
  const canCreate =
    me != null && hasMePermission(me, "create", "BudgetSupplementRequest");
  const canUpdate =
    me != null && hasMePermission(me, "update", "BudgetSupplementRequest");

  const approved = budgets.filter((b) => b.status === "APPROVED");
  const [budgetId, setBudgetId] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [financeNote, setFinanceNote] = useState("");

  const effectiveBudgetId = budgetId || approved[0]?.id || "";

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["budget", "supplement-requests"] as const,
    queryFn: async () => {
      const { data } = await api.get<BudgetSupplementRequestDto[]>(
        "/budget/supplement-requests",
      );
      return data;
    },
    enabled: Boolean(me && canRead),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const amt = Number(amount.replace(",", "."));
      await api.post(`/budget/${effectiveBudgetId}/supplement-requests`, {
        amountRequested: amt,
        reason: reason.trim(),
      });
    },
    onSuccess: async () => {
      setAmount("");
      setReason("");
      await queryClient.invalidateQueries({
        queryKey: ["budget", "supplement-requests"],
      });
    },
    onError: (e) => {
      alert(apiErrorMessage(e, "Demande impossible"));
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/budget/supplement-requests/${id}/submit`, {
        financeNote: financeNote.trim() || undefined,
      });
    },
    onSuccess: async () => {
      setFinanceNote("");
      await queryClient.invalidateQueries({
        queryKey: ["budget", "supplement-requests"],
      });
    },
    onError: (e) => {
      alert(apiErrorMessage(e, "Transmission impossible"));
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) =>
      api.post(`/budget/supplement-requests/${id}/approve`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["budget"] });
      await queryClient.invalidateQueries({
        queryKey: ["budget", "supplement-requests"],
      });
    },
    onError: (e) => {
      alert(apiErrorMessage(e, "Validation impossible"));
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      const rejectionReason = window.prompt("Motif du refus :");
      if (!rejectionReason?.trim()) {
        throw new Error("Motif requis");
      }
      await api.post(`/budget/supplement-requests/${id}/reject`, {
        rejectionReason: rejectionReason.trim(),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["budget", "supplement-requests"],
      });
    },
    onError: (e) => {
      alert(apiErrorMessage(e, "Refus impossible"));
    },
  });

  if (!canRead) return null;

  const financeCanAct = me != null && canProposeBudget(me, isMain) && canUpdate;
  const directorCanAct = me != null && isBudgetFinalApprover(me) && canUpdate;

  return (
    <Card className="py-4">
      <CardHeader className="px-4 sm:px-6">
        <CardTitle className="text-lg">Demandes de rallonge</CardTitle>
        <CardDescription>
          {isMain
            ? "La filiale demande un budget supplémentaire ; le pôle finance instruit puis la direction valide."
            : "Si une ligne est saturée, demandez une rallonge à la maison mère."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-4 sm:px-6">
        {!isMain && canCreate && approved.length > 0 ? (
          <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-muted/20 p-3">
            <div className="min-w-[200px] flex-1">
              <Label>Budget validé</Label>
              <select
                className="mt-1 h-10 w-full rounded-lg border border-input px-3 text-sm"
                value={effectiveBudgetId}
                onChange={(e) => setBudgetId(e.target.value)}
              >
                {approved.map((b) => (
                  <option key={b.id} value={b.id}>
                    {MONTHS_FR[b.month - 1]} {b.year}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-36">
              <Label>Montant (FCFA)</Label>
              <Input
                className="mt-1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="min-w-[200px] flex-1">
              <Label>Motif</Label>
              <Input
                className="mt-1"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
            <Button
              type="button"
              disabled={createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              Envoyer à la finance
            </Button>
          </div>
        ) : null}

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : requests.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune demande.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  {isMain ? (
                    <th className="px-3 py-2 font-semibold">Filiale</th>
                  ) : null}
                  <th className="px-3 py-2 font-semibold">Période</th>
                  <th className="px-3 py-2 font-semibold">Montant</th>
                  <th className="px-3 py-2 font-semibold">Statut</th>
                  <th className="px-3 py-2 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id} className="border-b border-border/60">
                    {isMain ? (
                      <td className="px-3 py-2">
                        {r.budget.subsidiaryOrganization.name}
                      </td>
                    ) : null}
                    <td className="px-3 py-2 whitespace-nowrap">
                      {MONTHS_FR[r.budget.month - 1]} {r.budget.year}
                    </td>
                    <td className="px-3 py-2 font-mono tabular-nums">
                      {formatFcfa(parseDecimal(r.amountRequested))}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="secondary">
                        {SUPPLEMENT_STATUS_LABEL[r.status]}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        {financeCanAct &&
                        r.status === "PENDING_FINANCE" ? (
                          <>
                            <Input
                              placeholder="Note finance"
                              value={financeNote}
                              onChange={(e) => setFinanceNote(e.target.value)}
                              className="h-8 max-w-[180px]"
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => submitMutation.mutate(r.id)}
                            >
                              Transmettre à la direction
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="text-destructive"
                              onClick={() => rejectMutation.mutate(r.id)}
                            >
                              Refuser
                            </Button>
                          </>
                        ) : null}
                        {directorCanAct &&
                        r.status === "PENDING_APPROVAL" ? (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700"
                              onClick={() => approveMutation.mutate(r.id)}
                            >
                              Approuver
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="text-destructive"
                              onClick={() => rejectMutation.mutate(r.id)}
                            >
                              Refuser
                            </Button>
                          </>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {r.reason}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
