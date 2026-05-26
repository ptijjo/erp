import { StockOrderStatus } from '../generated/prisma/client';
import type { Prisma, StockOrder } from '../generated/prisma/client';

export type StockOrderBudgetLinkDto = {
  linked: boolean;
  reason?: string;
};

type OrderWithBudgetExpense = StockOrder & {
  budgetExpense: { id: string; amount: Prisma.Decimal } | null;
};

export type StockOrderResponseDto = Omit<OrderWithBudgetExpense, 'budgetExpense'> & {
  budgetLink: StockOrderBudgetLinkDto | null;
};

export type BudgetLinkResult = {
  linked: boolean;
  reason?: string;
};

const DEFAULT_UNLINKED_REASON =
  'Dépense non enregistrée sur le budget (budget validé ou ligne STOCK manquante).';

export function resolveStockOrderBudgetLink(
  order: Pick<StockOrder, 'status'> & {
    budgetExpense: { id: string } | null;
  },
  confirmResult?: BudgetLinkResult,
): StockOrderBudgetLinkDto | null {
  if (order.status !== StockOrderStatus.CONFIRMED) {
    return null;
  }
  if (confirmResult) {
    return confirmResult;
  }
  if (order.budgetExpense) {
    return { linked: true };
  }
  return { linked: false, reason: DEFAULT_UNLINKED_REASON };
}

export function toStockOrderResponse(
  order: OrderWithBudgetExpense,
  confirmResult?: BudgetLinkResult,
): StockOrderResponseDto {
  const { budgetExpense, ...rest } = order;
  return {
    ...rest,
    budgetLink: resolveStockOrderBudgetLink(
      { status: order.status, budgetExpense },
      confirmResult,
    ),
  };
}
