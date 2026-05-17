jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { BudgetExpenseService } from './budget-expense.service';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/auth.types';
import { BudgetStatus } from '../generated/prisma/client';

const mainViewer: AuthenticatedUser = {
  sub: 'u-main',
  email: 'dg@vifaa.local',
  organisationId: 'org-main',
  organizationType: 'MAIN',
  organizationSlug: 'vifaa',
  firstLogin: false,
  role: { id: 'r1', name: 'ADMIN', description: null, poleCode: null },
};

const subsidiaryViewer: AuthenticatedUser = {
  ...mainViewer,
  sub: 'u-sub',
  organisationId: 'org-sub',
  organizationType: 'SUBSIDIARY',
  organizationSlug: 'filiale',
  role: { ...mainViewer.role, name: 'MANAGER_FILIALE' },
};

const approvedLine = {
  id: 'line-1',
  budgetId: 'budget-1',
  category: 'LOYER' as const,
  label: 'Loyer',
  amountPlanned: 1000,
  budget: {
    id: 'budget-1',
    status: BudgetStatus.APPROVED,
    subsidiaryOrganizationId: 'org-sub',
  },
};

describe('BudgetExpenseService', () => {
  let service: BudgetExpenseService;
  let budgetLineFindUnique: jest.Mock;
  let budgetExpenseCreate: jest.Mock;
  let budgetExpenseFindMany: jest.Mock;
  let budgetExpenseFindUnique: jest.Mock;
  let budgetExpenseDelete: jest.Mock;

  beforeEach(async () => {
    budgetLineFindUnique = jest.fn().mockResolvedValue(approvedLine);
    budgetExpenseCreate = jest.fn().mockResolvedValue({
      id: 'exp-1',
      budgetLineId: 'line-1',
      amount: 500,
      label: 'Paiement',
      spentAt: new Date('2026-05-10T00:00:00.000Z'),
      recordedByUserId: 'u-sub',
    });
    budgetExpenseFindMany = jest.fn().mockResolvedValue([]);
    budgetExpenseFindUnique = jest.fn().mockResolvedValue({
      id: 'exp-1',
      budgetLineId: 'line-1',
      amount: 500,
      budgetLine: {
        budget: {
          subsidiaryOrganizationId: 'org-sub',
          status: BudgetStatus.APPROVED,
        },
      },
    });
    budgetExpenseDelete = jest.fn().mockResolvedValue({ id: 'exp-1' });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BudgetExpenseService,
        {
          provide: PrismaService,
          useValue: {
            budgetLine: { findUnique: budgetLineFindUnique },
            budgetExpense: {
              create: budgetExpenseCreate,
              findMany: budgetExpenseFindMany,
              findUnique: budgetExpenseFindUnique,
              delete: budgetExpenseDelete,
            },
          },
        },
      ],
    }).compile();

    service = module.get<BudgetExpenseService>(BudgetExpenseService);
  });

  describe('recordExpense', () => {
    const dto = { amount: 500, label: 'Paiement' };

    it('refuse la maison mère', async () => {
      await expect(
        service.recordExpense('budget-1', 'line-1', dto, mainViewer),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(budgetExpenseCreate).not.toHaveBeenCalled();
    });

    it('refuse si la ligne est introuvable', async () => {
      budgetLineFindUnique.mockResolvedValueOnce(null);
      await expect(
        service.recordExpense('budget-1', 'line-1', dto, subsidiaryViewer),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('refuse si la ligne n’appartient pas au budget', async () => {
      budgetLineFindUnique.mockResolvedValueOnce({
        ...approvedLine,
        budgetId: 'other-budget',
      });
      await expect(
        service.recordExpense('budget-1', 'line-1', dto, subsidiaryViewer),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuse si le budget n’est pas validé', async () => {
      budgetLineFindUnique.mockResolvedValueOnce({
        ...approvedLine,
        budget: { ...approvedLine.budget, status: BudgetStatus.DRAFT },
      });
      await expect(
        service.recordExpense('budget-1', 'line-1', dto, subsidiaryViewer),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuse une autre filiale', async () => {
      budgetLineFindUnique.mockResolvedValueOnce({
        ...approvedLine,
        budget: {
          ...approvedLine.budget,
          subsidiaryOrganizationId: 'org-other',
        },
      });
      await expect(
        service.recordExpense('budget-1', 'line-1', dto, subsidiaryViewer),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('enregistre une sortie sur budget validé', async () => {
      const row = await service.recordExpense(
        'budget-1',
        'line-1',
        dto,
        subsidiaryViewer,
      );
      expect(budgetExpenseCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            budgetLineId: 'line-1',
            amount: 500,
            label: 'Paiement',
            recordedByUserId: 'u-sub',
          }),
        }),
      );
      expect(row.id).toBe('exp-1');
    });
  });

  describe('findByBudget', () => {
    it('refuse si le budget est introuvable', async () => {
      const budgetFindUnique = jest.fn().mockResolvedValue(null);
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          BudgetExpenseService,
          {
            provide: PrismaService,
            useValue: {
              budget: { findUnique: budgetFindUnique },
              budgetLine: { findUnique: budgetLineFindUnique },
              budgetExpense: { findMany: budgetExpenseFindMany },
            },
          },
        ],
      }).compile();
      const svc = module.get<BudgetExpenseService>(BudgetExpenseService);
      await expect(svc.findByBudget('missing', mainViewer)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('refuse la maison mère', async () => {
      await expect(service.remove('exp-1', mainViewer)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('supprime une sortie de sa filiale', async () => {
      await service.remove('exp-1', subsidiaryViewer);
      expect(budgetExpenseDelete).toHaveBeenCalledWith({ where: { id: 'exp-1' } });
    });
  });
});
