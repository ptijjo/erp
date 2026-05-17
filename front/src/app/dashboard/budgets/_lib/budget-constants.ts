import type { BudgetDto, BudgetLineCategoryDto } from "~/lib/api-types";

export const CATEGORY_LABEL: Record<BudgetLineCategoryDto, string> = {
  LOYER: "Loyer",
  SALAIRE: "Salaires",
};

export const STATUS_LABEL: Record<BudgetDto["status"], string> = {
  DRAFT: "Brouillon",
  APPROVED: "Validé",
};

export const MONTHS_FR = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
] as const;

export const CATEGORY_CHART_COLORS: Record<BudgetLineCategoryDto, string> = {
  LOYER: "hsl(var(--chart-1, 217 91% 60%))",
  SALAIRE: "hsl(var(--chart-2, 262 83% 58%))",
};

export const PLANNED_BAR_FILL = "hsl(220 25% 75%)";
export const SPENT_BAR_FILL = "hsl(var(--primary))";
