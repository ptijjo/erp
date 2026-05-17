"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { BudgetCharts } from "~/app/dashboard/budgets/_components/BudgetCharts";
import { CATEGORY_LABEL } from "~/app/dashboard/budgets/_lib/budget-constants";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { api } from "~/lib/api";
import type { BudgetDto, BudgetExpenseDto } from "~/lib/api-types";
import { formatFcfa } from "~/lib/format-fcfa";
import { parseDecimal } from "~/lib/parse-decimal";
import { apiErrorMessage } from "~/lib/api-error-message";

type BudgetExpensesPanelProps = {
  budgets: BudgetDto[];
  canViewExpenses: boolean;
  canRecordExpense: boolean;
  isMain: boolean;
};

function spentByLine(
  expenses: BudgetExpenseDto[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const e of expenses) {
    map.set(e.budgetLineId, (map.get(e.budgetLineId) ?? 0) + parseDecimal(e.amount));
  }
  return map;
}

export function BudgetExpensesPanel({
  budgets,
  canViewExpenses,
  canRecordExpense,
  isMain,
}: BudgetExpensesPanelProps) {
  const queryClient = useQueryClient();
  const approved = useMemo(
    () => budgets.filter((b) => b.status === "APPROVED"),
    [budgets],
  );

  const [budgetId, setBudgetId] = useState("");
  const [lineId, setLineId] = useState("");
  const [amount, setAmount] = useState("");
  const [label, setLabel] = useState("");

  const effectiveBudgetId = budgetId || approved[0]?.id || "";

  const selectedBudget = approved.find((b) => b.id === effectiveBudgetId);

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["budget", effectiveBudgetId, "expenses"] as const,
    queryFn: async () => {
      const { data } = await api.get<BudgetExpenseDto[]>(
        `/budget/${effectiveBudgetId}/expenses`,
      );
      return data;
    },
    enabled: canViewExpenses && effectiveBudgetId.length > 0,
  });

  const spentMap = useMemo(() => spentByLine(expenses), [expenses]);

  const recordMutation = useMutation({
    mutationFn: async () => {
      const amt = Number(amount.replace(",", "."));
      await api.post(
        `/budget/${effectiveBudgetId}/lines/${lineId}/expenses`,
        {
          amount: amt,
          ...(label.trim() ? { label: label.trim() } : {}),
        },
      );
    },
    onSuccess: async () => {
      setAmount("");
      setLabel("");
      await queryClient.invalidateQueries({ queryKey: ["budget"] });
      await queryClient.invalidateQueries({
        queryKey: ["budget", effectiveBudgetId, "expenses"],
      });
    },
    onError: (e) => {
      alert(apiErrorMessage(e, "Impossible d’enregistrer la sortie"));
    },
  });

  if (!canViewExpenses || approved.length === 0) {
    return null;
  }

  return (
    <Card className="py-4">
      <CardHeader className="px-4 sm:px-6">
        <CardTitle className="text-lg">Suivi & sorties (réalisé)</CardTitle>
        <CardDescription>
          {isMain
            ? "Visualisez la consommation des budgets validés et les dépenses saisies par les filiales."
            : "Saisissez vos dépenses réelles et suivez l’écart par rapport au budget validé."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-4 sm:px-6">
        <div className="flex flex-wrap gap-4">
          <div className="min-w-[220px] flex-1">
            <Label htmlFor="expense-budget">Budget</Label>
            <Select
              value={effectiveBudgetId}
              onValueChange={(v) => {
                setBudgetId(v);
                setLineId("");
              }}
            >
              <SelectTrigger id="expense-budget" className="mt-1 w-full">
                <SelectValue placeholder="Choisir un budget" />
              </SelectTrigger>
              <SelectContent>
                {approved.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {isMain ? `${b.subsidiaryOrganization.name} — ` : ""}
                    {b.month}/{b.year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {canRecordExpense && selectedBudget ? (
            <>
              <div className="min-w-[200px] flex-1">
                <Label htmlFor="expense-line">Ligne budgétaire</Label>
                <Select value={lineId} onValueChange={setLineId}>
                  <SelectTrigger id="expense-line" className="mt-1 w-full">
                    <SelectValue placeholder="Ligne" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedBudget.lines.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {CATEGORY_LABEL[l.category]} — {l.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-36">
                <Label htmlFor="expense-amount">Montant (FCFA)</Label>
                <Input
                  id="expense-amount"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="min-w-[160px] flex-1">
                <Label htmlFor="expense-label">Libellé (optionnel)</Label>
                <Input
                  id="expense-label"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="ex. Virement loyer"
                  className="mt-1"
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  disabled={
                    !lineId ||
                    !amount.trim() ||
                    recordMutation.isPending
                  }
                  onClick={() => recordMutation.mutate()}
                >
                  {recordMutation.isPending ? "Enregistrement…" : "Ajouter"}
                </Button>
              </div>
            </>
          ) : null}
        </div>

        {selectedBudget && !isLoading ? (
          <BudgetCharts budget={selectedBudget} spentByLineId={spentMap} />
        ) : isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement des données…</p>
        ) : null}

        {selectedBudget ? (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-3 py-2 font-semibold">Ligne</th>
                  <th className="px-3 py-2 text-right font-semibold">Prévu</th>
                  <th className="px-3 py-2 text-right font-semibold">Dépensé</th>
                  <th className="px-3 py-2 text-right font-semibold">Écart</th>
                </tr>
              </thead>
              <tbody>
                {selectedBudget.lines.map((l) => {
                  const planned = parseDecimal(l.amountPlanned);
                  const spent = spentMap.get(l.id) ?? 0;
                  const delta = planned - spent;
                  return (
                    <tr key={l.id} className="border-b border-border/60 last:border-0">
                      <td className="px-3 py-2">
                        <span className="font-medium">
                          {CATEGORY_LABEL[l.category]}
                        </span>
                        <span className="text-muted-foreground"> — {l.label}</span>
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums">
                        {formatFcfa(planned)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums">
                        {formatFcfa(spent)}
                      </td>
                      <td
                        className={`px-3 py-2 text-right font-mono tabular-nums ${
                          delta < 0 ? "text-destructive" : "text-emerald-700"
                        }`}
                      >
                        {formatFcfa(delta)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}

        {isLoading ? null : expenses.length > 0 ? (
          <div>
            <h3 className="mb-2 text-sm font-semibold text-foreground">
              Historique des sorties
            </h3>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Ligne</th>
                    <th className="px-3 py-2">Libellé</th>
                    <th className="px-3 py-2 text-right">Montant</th>
                    {canRecordExpense ? (
                      <th className="px-3 py-2 text-right"> </th>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((e) => (
                    <tr key={e.id} className="border-b border-border/60 last:border-0">
                      <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                        {new Date(e.spentAt).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="px-3 py-2">
                        {CATEGORY_LABEL[e.budgetLine.category]} —{" "}
                        {e.budgetLine.label}
                      </td>
                      <td className="px-3 py-2">{e.label ?? "—"}</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums">
                        {formatFcfa(parseDecimal(e.amount))}
                      </td>
                      {canRecordExpense ? (
                        <td className="px-3 py-2 text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={async () => {
                              if (!confirm("Supprimer cette sortie ?")) return;
                              try {
                                await api.delete(`/budget/expenses/${e.id}`);
                                await queryClient.invalidateQueries({
                                  queryKey: ["budget"],
                                });
                                await queryClient.invalidateQueries({
                                  queryKey: [
                                    "budget",
                                    effectiveBudgetId,
                                    "expenses",
                                  ],
                                });
                              } catch (err) {
                                alert(
                                  apiErrorMessage(err, "Suppression impossible"),
                                );
                              }
                            }}
                          >
                            Supprimer
                          </Button>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : selectedBudget ? (
          <p className="text-sm text-muted-foreground">
            Aucune sortie enregistrée pour ce budget.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
