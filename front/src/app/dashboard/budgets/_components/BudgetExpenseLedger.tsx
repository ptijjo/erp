"use client";

import { useQuery } from "@tanstack/react-query";

import {
  CATEGORY_LABEL,
  MONTHS_FR,
  NATURE_LABEL,
} from "~/app/dashboard/budgets/_lib/budget-constants";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { hasMePermission, isMainOrganization, useMe } from "~/hooks/use-me";
import { api } from "~/lib/api";
import type { BudgetExpenseDto } from "~/lib/api-types";
import { formatFcfa } from "~/lib/format-fcfa";
import { parseDecimal } from "~/lib/parse-decimal";

export function BudgetExpenseLedger() {
  const { data: me } = useMe();
  const isMain = me != null && isMainOrganization(me);
  const canRead =
    me != null && hasMePermission(me, "read", "BudgetExpense");

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["budget", "expenses", "ledger"] as const,
    queryFn: async () => {
      const { data } = await api.get<BudgetExpenseDto[]>(
        "/budget/expenses/ledger",
      );
      return data;
    },
    enabled: Boolean(me && canRead),
  });

  if (!canRead) return null;

  return (
    <Card className="py-4">
      <CardHeader className="px-4 sm:px-6">
        <CardTitle className="text-lg">Journal des dépenses</CardTitle>
        <CardDescription>
          Liste consolidée des sorties pour la transparence comptable
          {isMain ? " (toutes filiales)" : " (votre filiale)"}.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4 sm:px-6">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : expenses.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune dépense.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-3 py-2 font-semibold">Date</th>
                  {isMain ? (
                    <th className="px-3 py-2 font-semibold">Filiale</th>
                  ) : null}
                  <th className="px-3 py-2 font-semibold">Période</th>
                  <th className="px-3 py-2 font-semibold">Nature</th>
                  <th className="px-3 py-2 font-semibold">Catégorie / ligne</th>
                  <th className="px-3 py-2 font-semibold">Libellé</th>
                  <th className="px-3 py-2 font-semibold">Source</th>
                  <th className="px-3 py-2 text-right font-semibold">Montant</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id} className="border-b border-border/60">
                    <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                      {new Date(e.spentAt).toLocaleDateString("fr-FR")}
                    </td>
                    {isMain ? (
                      <td className="px-3 py-2">
                        {e.budgetLine.budget?.subsidiaryOrganization.name ?? "—"}
                      </td>
                    ) : null}
                    <td className="px-3 py-2 whitespace-nowrap">
                      {e.budgetLine.budget
                        ? `${MONTHS_FR[e.budgetLine.budget.month - 1]} ${e.budgetLine.budget.year}`
                        : "—"}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {NATURE_LABEL[e.budgetLine.nature]}
                    </td>
                    <td className="px-3 py-2">
                      {CATEGORY_LABEL[e.budgetLine.category]} — {e.budgetLine.label}
                    </td>
                    <td className="px-3 py-2">{e.label ?? "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {e.stockOrderId ? "Commande stock" : "Saisie manuelle"}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">
                      {formatFcfa(parseDecimal(e.amount))}
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
