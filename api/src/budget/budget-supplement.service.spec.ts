jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { BudgetSupplementService } from './budget-supplement.service';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/auth.types';
import {
  BudgetStatus,
  BudgetSupplementStatus,
} from '../generated/prisma/client';

const financeViewer: AuthenticatedUser = {
  sub: 'u-fin',
  email: 'df@vifaa.local',
  organisationId: 'org-main',
  organizationType: 'MAIN',
  organizationSlug: 'vifaa',
  firstLogin: false,
  role: {
    id: 'r-fin',
    name: 'DIRECTOR_FINANCE',
    description: null,
    poleCode: 'Pole_FINANCE',
  },
};

const dgViewer: AuthenticatedUser = {
  ...financeViewer,
  sub: 'u-dg',
  role: {
    id: 'r-dg',
    name: 'DIRECTOR_GENERAL',
    description: null,
    poleCode: null,
  },
};

const subsidiaryViewer: AuthenticatedUser = {
  ...financeViewer,
  sub: 'u-sub',
  organisationId: 'org-sub',
  organizationType: 'SUBSIDIARY',
  organizationSlug: 'filiale',
  role: { ...financeViewer.role, name: 'MANAGER_FILIALE' },
};

const supplementRow = {
  id: 'sup-1',
  budgetId: 'budget-1',
  amountRequested: 5000,
  reason: 'Dépassement stock',
  status: BudgetSupplementStatus.PENDING_FINANCE,
  financeNote: null,
  rejectionReason: null,
  requestedByUserId: 'u-sub',
  budget: {
    id: 'budget-1',
    year: 2026,
    month: 5,
    status: BudgetStatus.APPROVED,
    subsidiaryOrganizationId: 'org-sub',
    subsidiaryOrganization: {
      id: 'org-sub',
      name: 'Filiale',
      slug: 'filiale',
    },
  },
};

describe('BudgetSupplementService', () => {
  let service: BudgetSupplementService;
  let findMany: jest.Mock;
  let findUnique: jest.Mock;
  let create: jest.Mock;
  let update: jest.Mock;
  let budgetFindUnique: jest.Mock;
  let transaction: jest.Mock;

  beforeEach(async () => {
    findMany = jest.fn().mockResolvedValue([supplementRow]);
    findUnique = jest.fn().mockResolvedValue(supplementRow);
    create = jest.fn().mockResolvedValue({ id: 'sup-new', ...supplementRow });
    update = jest.fn().mockImplementation(({ data }) =>
      Promise.resolve({ ...supplementRow, ...data }),
    );
    budgetFindUnique = jest.fn().mockResolvedValue({
      id: 'budget-1',
      status: BudgetStatus.APPROVED,
      subsidiaryOrganizationId: 'org-sub',
    });
    transaction = jest.fn(async (cb: (tx: unknown) => unknown) =>
      cb({
        budgetSupplementRequest: { update },
        budgetLine: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn(),
          update: jest.fn(),
        },
      }),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BudgetSupplementService,
        {
          provide: PrismaService,
          useValue: {
            budgetSupplementRequest: {
              findMany,
              findUnique,
              create,
              update,
            },
            budget: { findUnique: budgetFindUnique },
            $transaction: transaction,
          },
        },
      ],
    }).compile();

    service = module.get(BudgetSupplementService);
  });

  it('refuse la création par la maison mère', async () => {
    await expect(
      service.create(
        'budget-1',
        { amountRequested: 1000, reason: 'Besoin urgent' },
        financeViewer,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('crée une demande pour une filiale sur budget validé', async () => {
    await service.create(
      'budget-1',
      { amountRequested: 1000, reason: 'Besoin urgent' },
      subsidiaryViewer,
    );
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: BudgetSupplementStatus.PENDING_FINANCE,
        }),
      }),
    );
  });

  it('transmet au statut PENDING_APPROVAL pour la finance', async () => {
    await service.submitToDirectors(
      'sup-1',
      { financeNote: 'Validé côté finance' },
      financeViewer,
    );
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: BudgetSupplementStatus.PENDING_APPROVAL,
        }),
      }),
    );
  });

  it('refuse l’approbation par le directeur finance', async () => {
    findUnique.mockResolvedValueOnce({
      ...supplementRow,
      status: BudgetSupplementStatus.PENDING_APPROVAL,
    });
    await expect(service.approve('sup-1', financeViewer)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('NotFoundException si demande absente', async () => {
    findUnique.mockResolvedValueOnce(null);
    await expect(
      service.submitToDirectors('missing', {}, financeViewer),
    ).rejects.toThrow(NotFoundException);
  });

  it('refuse la transmission si le statut n’est pas PENDING_FINANCE', async () => {
    findUnique.mockResolvedValueOnce({
      ...supplementRow,
      status: BudgetSupplementStatus.APPROVED,
    });
    await expect(
      service.submitToDirectors('sup-1', {}, financeViewer),
    ).rejects.toThrow(BadRequestException);
  });
});
