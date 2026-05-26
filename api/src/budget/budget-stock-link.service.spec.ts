jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { BudgetStockLinkService } from './budget-stock-link.service';
import { PrismaService } from '../prisma/prisma.service';
import { BudgetStatus } from '../generated/prisma/client';

const order = {
  id: 'order-1',
  subsidiaryOrganizationId: 'org-sub',
  quantity: 2,
  unitPrice: 1500,
  createdAt: new Date('2026-05-15T12:00:00.000Z'),
  requestedByUserId: 'u-sub',
  product: { name: 'Riz 25kg' },
};

describe('BudgetStockLinkService', () => {
  let service: BudgetStockLinkService;
  let budgetFindFirst: jest.Mock;
  let budgetLineFindFirst: jest.Mock;
  let budgetExpenseFindUnique: jest.Mock;
  let budgetExpenseAggregate: jest.Mock;
  let budgetExpenseCreate: jest.Mock;

  beforeEach(async () => {
    budgetFindFirst = jest.fn().mockResolvedValue({ id: 'budget-1' });
    budgetLineFindFirst = jest
      .fn()
      .mockResolvedValue({ id: 'line-stock', amountPlanned: 10000 });
    budgetExpenseFindUnique = jest.fn().mockResolvedValue(null);
    budgetExpenseAggregate = jest
      .fn()
      .mockResolvedValue({ _sum: { amount: 0 } });
    budgetExpenseCreate = jest.fn().mockResolvedValue({ id: 'exp-1' });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BudgetStockLinkService,
        {
          provide: PrismaService,
          useValue: {
            budget: { findFirst: budgetFindFirst },
            budgetLine: { findFirst: budgetLineFindFirst },
            budgetExpense: {
              findUnique: budgetExpenseFindUnique,
              aggregate: budgetExpenseAggregate,
              create: budgetExpenseCreate,
            },
          },
        },
      ],
    }).compile();

    service = module.get(BudgetStockLinkService);
  });

  it('crée une sortie liée à la commande', async () => {
    const result = await service.recordExpenseForConfirmedStockOrder(order);
    expect(result.linked).toBe(true);
    expect(budgetExpenseCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          stockOrderId: 'order-1',
          amount: 3000,
          budgetLineId: 'line-stock',
        }),
      }),
    );
    expect(budgetFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: BudgetStatus.APPROVED,
          month: 5,
          year: 2026,
        }),
      }),
    );
  });

  it('ignore si aucun budget validé', async () => {
    budgetFindFirst.mockResolvedValueOnce(null);
    const result = await service.recordExpenseForConfirmedStockOrder(order);
    expect(result.linked).toBe(false);
    expect(budgetExpenseCreate).not.toHaveBeenCalled();
  });
});
