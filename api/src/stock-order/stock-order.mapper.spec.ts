import { StockOrderStatus } from '../generated/prisma/client';
import {
  resolveStockOrderBudgetLink,
  toStockOrderResponse,
} from './stock-order.mapper';

const baseOrder = {
  id: 'o1',
  status: StockOrderStatus.CONFIRMED,
  budgetExpense: null,
} as const;

describe('stock-order.mapper', () => {
  it('retourne null pour une commande en attente', () => {
    expect(
      resolveStockOrderBudgetLink({
        status: StockOrderStatus.PENDING,
        budgetExpense: null,
      }),
    ).toBeNull();
  });

  it('indique lié si une dépense existe', () => {
    expect(
      resolveStockOrderBudgetLink({
        ...baseOrder,
        budgetExpense: { id: 'exp-1' },
      }),
    ).toEqual({ linked: true });
  });

  it('utilise le résultat de confirmation frais', () => {
    expect(
      resolveStockOrderBudgetLink(baseOrder, {
        linked: false,
        reason: 'Solde insuffisant',
      }),
    ).toEqual({ linked: false, reason: 'Solde insuffisant' });
  });

  it('retire budgetExpense de la réponse API', () => {
    const dto = toStockOrderResponse({
      id: 'o1',
      createdAt: new Date(),
      updatedAt: new Date(),
      subsidiaryOrganizationId: 'org',
      productId: 'p',
      supplierId: 's',
      unitPrice: 100 as never,
      quantity: 1,
      status: StockOrderStatus.CONFIRMED,
      note: null,
      requestedByUserId: null,
      budgetExpense: { id: 'e1', amount: 100 as never },
    });
    expect(dto).not.toHaveProperty('budgetExpense');
    expect(dto.budgetLink).toEqual({ linked: true });
  });
});
