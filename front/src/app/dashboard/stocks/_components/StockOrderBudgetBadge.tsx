import { AlertTriangle, Link2, Unlink } from "lucide-react";

import type { StockOrderBudgetLinkDto } from "~/lib/api-types";

type StockOrderBudgetBadgeProps = {
  budgetLink: StockOrderBudgetLinkDto | null;
};

export function StockOrderBudgetBadge({
  budgetLink,
}: StockOrderBudgetBadgeProps) {
  if (budgetLink == null) {
    return <span className="text-xs text-gray-400">—</span>;
  }

  if (budgetLink.linked) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-900"
        title="Sortie enregistrée sur la ligne STOCK du budget"
      >
        <Link2 className="size-3" />
        Budget
      </span>
    );
  }

  return (
    <span
      className="inline-flex max-w-56 items-start gap-1 rounded bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-950"
      title={budgetLink.reason}
    >
      <Unlink className="mt-0.5 size-3 shrink-0" />
      <span className="text-left leading-snug">
        Hors budget
        {budgetLink.reason ? (
          <span className="mt-0.5 block font-normal text-amber-800/90">
            {budgetLink.reason}
          </span>
        ) : null}
      </span>
    </span>
  );
}

export function StockOrderBudgetConfirmHint() {
  return (
    <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-950">
      <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
      La réception met à jour le stock. L’imputation budget nécessite un budget
      validé du mois avec une ligne « Gestion de stock » et un solde suffisant.
    </p>
  );
}
