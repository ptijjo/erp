jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { BudgetOverviewService } from './budget-overview.service';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/auth.types';

const mainViewer: AuthenticatedUser = {
  sub: 'u-main',
  email: 'dg@vifaa.local',
  organisationId: 'org-main',
  organizationType: 'MAIN',
  organizationSlug: 'vifaa',
  firstLogin: false,
  role: { id: 'r1', name: 'ADMIN', description: null, poleCode: null },
};

describe('BudgetOverviewService', () => {
  let service: BudgetOverviewService;
  let budgetCount: jest.Mock;
  let supplementCount: jest.Mock;
  let budgetFindMany: jest.Mock;
  let expenseAggregate: jest.Mock;
  let stockOrderCount: jest.Mock;
  let stockOrderAggregate: jest.Mock;

  beforeEach(async () => {
    budgetCount = jest.fn().mockResolvedValue(0);
    supplementCount = jest.fn().mockResolvedValue(0);
    budgetFindMany = jest.fn().mockResolvedValue([]);
    expenseAggregate = jest
      .fn()
      .mockResolvedValue({ _sum: { amount: 0 } });
    stockOrderCount = jest.fn().mockResolvedValue(0);
    stockOrderAggregate = jest
      .fn()
      .mockResolvedValue({ _sum: { amount: null } });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BudgetOverviewService,
        {
          provide: PrismaService,
          useValue: {
            budget: { count: budgetCount, findMany: budgetFindMany },
            budgetSupplementRequest: { count: supplementCount },
            budgetExpense: { aggregate: expenseAggregate },
            stockOrder: {
              count: stockOrderCount,
              aggregate: stockOrderAggregate,
              findMany: jest.fn().mockResolvedValue([]),
            },
          },
        },
      ],
    }).compile();

    service = module.get(BudgetOverviewService);
  });

  it('retourne une synthèse annuelle', async () => {
    const result = await service.getOverview(mainViewer, { year: 2026 });
    expect(result.year).toBe(2026);
    expect(result.totals.plannedFcfa).toBe(0);
    expect(budgetCount).toHaveBeenCalled();
  });
});
