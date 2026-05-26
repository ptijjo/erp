jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../prisma/prisma.service';
import { CaslAbilityFactory } from '../casl/casl-ability.factory';
import { BudgetOverviewService } from '../budget/budget-overview.service';
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

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let createForUser: jest.Mock;

  beforeEach(async () => {
    createForUser = jest.fn().mockResolvedValue({
      can: (action: string, subject: string) =>
        action === 'read' &&
        (subject === 'Budget' || subject === 'Vente' || subject === 'Stock'),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: PrismaService,
          useValue: {
            budgetExpense: { findMany: jest.fn().mockResolvedValue([]) },
            vente: { findMany: jest.fn().mockResolvedValue([]), groupBy: jest.fn().mockResolvedValue([]) },
            venteLine: { findMany: jest.fn().mockResolvedValue([]) },
            stock: { findMany: jest.fn().mockResolvedValue([]) },
            organization: { findMany: jest.fn().mockResolvedValue([]) },
          },
        },
        {
          provide: CaslAbilityFactory,
          useValue: { createForUser },
        },
        {
          provide: BudgetOverviewService,
          useValue: {
            getOverview: jest.fn().mockResolvedValue({
              year: 2026,
              workflow: {
                budgetsPendingApproval: 0,
                supplementsPendingFinance: 0,
                supplementsPendingDirectors: 0,
              },
              totals: {
                plannedFcfa: 0,
                spentFcfa: 0,
                utilizationPercent: 0,
              },
              bySubsidiary: [],
              byCategory: [],
              stockOrders: { pending: 0, confirmedMonthTotalFcfa: 0 },
            }),
          },
        },
      ],
    }).compile();

    service = module.get(AnalyticsService);
  });

  it('retourne les sections autorisées', async () => {
    const result = await service.getGroupOverview(mainViewer, { year: 2026 });
    expect(result.scope).toBe('MAIN');
    expect(result.budget).toBeDefined();
    expect(result.spendingByMonth).toHaveLength(12);
  });

  it('refuse si aucune section accessible', async () => {
    createForUser.mockResolvedValueOnce({ can: () => false });
    await expect(
      service.getGroupOverview(mainViewer, {}),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
