import {
  BudgetLineCategory,
  BudgetLineNature,
} from '../generated/prisma/client';

export const BUDGET_LINE_CATEGORIES = [
  'LOYER',
  'SALAIRE',
  'ELECTRICITE',
  'EAU',
  'INTERNET',
  'ASSURANCE',
  'STOCK',
  'MAINTENANCE',
  'MATERIEL',
  'TRANSPORT',
  'AUTRE',
] as const;

export const BUDGET_LINE_NATURES = ['FIXED', 'VARIABLE'] as const;

export type BudgetLineCategoryValue = (typeof BUDGET_LINE_CATEGORIES)[number];
export type BudgetLineNatureValue = (typeof BUDGET_LINE_NATURES)[number];

export function defaultNatureForCategory(
  category: BudgetLineCategoryValue,
): BudgetLineNature {
  switch (category) {
    case 'STOCK':
    case 'MAINTENANCE':
    case 'MATERIEL':
    case 'TRANSPORT':
      return BudgetLineNature.VARIABLE;
    default:
      return BudgetLineNature.FIXED;
  }
}
