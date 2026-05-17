jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { BudgetService } from './budget.service';
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
  role: {
    id: 'r-admin',
    name: 'ADMIN',
    description: null,
    poleCode: null,
  },
};

const subsidiaryViewer: AuthenticatedUser = {
  ...mainViewer,
  sub: 'u-sub',
  email: 'mgr@filiale.local',
  organisationId: 'org-sub',
  organizationType: 'SUBSIDIARY',
  organizationSlug: 'filiale',
  role: { ...mainViewer.role, name: 'MANAGER_FILIALE' },
};

const budgetRow = {
  id: 'budget-1',
  subsidiaryOrganizationId: 'org-sub',
  year: 2026,
  month: 5,
  status: BudgetStatus.DRAFT,
  createdAt: new Date(),
  updatedAt: new Date(),
  subsidiaryOrganization: {
    id: 'org-sub',
    name: 'Filiale A',
    slug: 'filiale-a',
    organizationType: 'SUBSIDIARY' as const,
  },
  lines: [
    {
      id: 'line-1',
      budgetId: 'budget-1',
      category: 'LOYER' as const,
      label: 'Loyer siège',
      amountPlanned: 1500,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
};

const createDto = {
  subsidiaryOrganizationId: 'org-sub',
  year: 2026,
  month: 6,
  lines: [{ category: 'LOYER' as const, label: 'Loyer', amountPlanned: 2000 }],
};

describe('BudgetService', () => {
  let service: BudgetService;
  let findMany: jest.Mock;
  let findUnique: jest.Mock;
  let update: jest.Mock;
  let deleteBudget: jest.Mock;
  let organizationFindUnique: jest.Mock;
  let transactionCreate: jest.Mock;
  let transaction: jest.Mock;

  beforeEach(async () => {
    findMany = jest.fn().mockResolvedValue([budgetRow]);
    findUnique = jest.fn().mockResolvedValue(budgetRow);
    update = jest.fn().mockImplementation(({ where, data }) =>
      Promise.resolve({
        ...budgetRow,
        ...where,
        status: data.status ?? budgetRow.status,
      }),
    );
    deleteBudget = jest.fn().mockResolvedValue(budgetRow);
    organizationFindUnique = jest.fn().mockResolvedValue({
      organizationType: 'SUBSIDIARY',
    });
    transactionCreate = jest.fn().mockResolvedValue({
      ...budgetRow,
      id: 'budget-new',
      month: createDto.month,
    });
    transaction = jest.fn(async (cb: (tx: { budget: { create: jest.Mock } }) => unknown) =>
      cb({ budget: { create: transactionCreate } }),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BudgetService,
        {
          provide: PrismaService,
          useValue: {
            budget: {
              findMany,
              findUnique,
              update,
              delete: deleteBudget,
            },
            organization: { findUnique: organizationFindUnique },
            $transaction: transaction,
          },
        },
      ],
    }).compile();

    service = module.get<BudgetService>(BudgetService);
  });

  describe('findAll', () => {
    it('liste tous les budgets pour la maison mère', async () => {
      const rows = await service.findAll(mainViewer);
      expect(rows).toEqual([budgetRow]);
      expect(findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        include: expect.objectContaining({
          subsidiaryOrganization: expect.any(Object),
          lines: true,
        }),
      });
    });

    it('ne retourne que les budgets APPROVED de la filiale pour un viewer filiale', async () => {
      await service.findAll(subsidiaryViewer);
      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            subsidiaryOrganizationId: 'org-sub',
            status: BudgetStatus.APPROVED,
          },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('lève NotFoundException si le budget est absent', async () => {
      findUnique.mockResolvedValueOnce(null);
      await expect(service.findOne('missing', mainViewer)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('refuse à une filiale un budget non validé', async () => {
      await expect(
        service.findOne('budget-1', subsidiaryViewer),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('autorise une filiale à lire un budget APPROVED de son organisation', async () => {
      findUnique.mockResolvedValueOnce({
        ...budgetRow,
        status: BudgetStatus.APPROVED,
      });
      const row = await service.findOne('budget-1', subsidiaryViewer);
      expect(row.status).toBe(BudgetStatus.APPROVED);
    });

    it('autorise la maison mère à lire un brouillon', async () => {
      const row = await service.findOne('budget-1', mainViewer);
      expect(row.status).toBe(BudgetStatus.DRAFT);
    });
  });

  describe('create', () => {
    it('refuse les utilisateurs hors maison mère', async () => {
      await expect(service.create(createDto, subsidiaryViewer)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(transaction).not.toHaveBeenCalled();
    });

    it('exige une organisation filiale', async () => {
      organizationFindUnique.mockResolvedValueOnce({
        organizationType: 'MAIN',
      });
      await expect(service.create(createDto, mainViewer)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('crée un budget DRAFT avec lignes en transaction', async () => {
      const created = await service.create(createDto, mainViewer);
      expect(transaction).toHaveBeenCalled();
      expect(transactionCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            subsidiaryOrganizationId: 'org-sub',
            status: BudgetStatus.DRAFT,
            lines: {
              create: [
                {
                  category: 'LOYER',
                  label: 'Loyer',
                  amountPlanned: 2000,
                },
              ],
            },
          }),
        }),
      );
      expect(created.id).toBe('budget-new');
    });

    it('lève ConflictException si la période existe déjà', async () => {
      transaction.mockImplementationOnce(async () => {
        throw { code: 'P2002' };
      });
      await expect(service.create(createDto, mainViewer)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('update', () => {
    const updateDto = {
      lines: [{ category: 'LOYER' as const, label: 'Loyer révisé', amountPlanned: 1800 }],
    };

    it('refuse les utilisateurs hors maison mère', async () => {
      await expect(
        service.update('budget-1', updateDto, subsidiaryViewer),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('refuse la modification si le budget n’est pas en brouillon', async () => {
      findUnique.mockResolvedValueOnce({
        ...budgetRow,
        status: BudgetStatus.APPROVED,
      });
      await expect(
        service.update('budget-1', updateDto, mainViewer),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('remplace les lignes d’un brouillon', async () => {
      await service.update('budget-1', updateDto, mainViewer);
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'budget-1' },
          data: {
            lines: {
              deleteMany: {},
              create: [
                {
                  category: 'LOYER',
                  label: 'Loyer révisé',
                  amountPlanned: 1800,
                },
              ],
            },
          },
        }),
      );
    });
  });

  describe('approve', () => {
    it('passe un brouillon en APPROVED', async () => {
      await service.approve('budget-1', mainViewer);
      expect(update).toHaveBeenCalledWith({
        where: { id: 'budget-1' },
        data: { status: BudgetStatus.APPROVED },
        include: expect.any(Object),
      });
    });

    it('refuse d’approuver un budget déjà validé', async () => {
      findUnique.mockResolvedValueOnce({
        ...budgetRow,
        status: BudgetStatus.APPROVED,
      });
      await expect(service.approve('budget-1', mainViewer)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe('remove', () => {
    it('supprime un brouillon', async () => {
      const result = await service.remove('budget-1', mainViewer);
      expect(deleteBudget).toHaveBeenCalledWith({ where: { id: 'budget-1' } });
      expect(result).toEqual({ ok: true });
    });

    it('refuse la suppression d’un budget validé', async () => {
      findUnique.mockResolvedValueOnce({
        ...budgetRow,
        status: BudgetStatus.APPROVED,
      });
      await expect(service.remove('budget-1', mainViewer)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(deleteBudget).not.toHaveBeenCalled();
    });
  });
});
