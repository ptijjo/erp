import type {
  BudgetDto,
  BudgetLineCategoryDto,
  BudgetLineNatureDto,
  BudgetSupplementStatusDto,
} from "~/lib/api-types";

export const NATURE_LABEL: Record<BudgetLineNatureDto, string> = {
  FIXED: "Charge fixe",
  VARIABLE: "Charge variable",
};

export const CATEGORY_LABEL: Record<BudgetLineCategoryDto, string> = {
  LOYER: "Loyer",
  SALAIRE: "Salaires",
  ELECTRICITE: "Électricité",
  EAU: "Eau",
  INTERNET: "Internet / télécom",
  ASSURANCE: "Assurance",
  STOCK: "Gestion de stock",
  MAINTENANCE: "Maintenance",
  MATERIEL: "Matériel / équipement",
  TRANSPORT: "Transport",
  AUTRE: "Autre",
};

export const STATUS_LABEL: Record<BudgetDto["status"], string> = {
  DRAFT: "Brouillon (finance)",
  PENDING_APPROVAL: "En attente DG / opérations",
  APPROVED: "Validé",
  REJECTED: "Refusé",
};

export const SUPPLEMENT_STATUS_LABEL: Record<BudgetSupplementStatusDto, string> = {
  PENDING_FINANCE: "À instruire (finance)",
  PENDING_APPROVAL: "En attente DG / opérations",
  APPROVED: "Rallonge accordée",
  REJECTED: "Refusée",
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

export const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABEL) as [
  BudgetLineCategoryDto,
  string,
][];

export const NATURE_OPTIONS = Object.entries(NATURE_LABEL) as [
  BudgetLineNatureDto,
  string,
][];

export const CATEGORY_CHART_COLORS: Partial<Record<BudgetLineCategoryDto, string>> = {
  LOYER: "hsl(var(--chart-1, 217 91% 60%))",
  SALAIRE: "hsl(var(--chart-2, 262 83% 58%))",
  STOCK: "hsl(var(--chart-3, 142 76% 36%))",
  MAINTENANCE: "hsl(var(--chart-4, 27 96% 61%))",
};

export const PLANNED_BAR_FILL = "hsl(220 25% 75%)";
export const SPENT_BAR_FILL = "hsl(var(--primary))";
export const REVENUE_BAR_FILL = "#15803d";

/** Aligné sur `api/src/budget/budget-line.defaults.ts`. */
export function defaultNatureForCategory(
  category: BudgetLineCategoryDto,
): BudgetLineNatureDto {
  switch (category) {
    case "STOCK":
    case "MAINTENANCE":
    case "MATERIEL":
    case "TRANSPORT":
      return "VARIABLE";
    default:
      return "FIXED";
  }
}
