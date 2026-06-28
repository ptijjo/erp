jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { StockTransferService } from './stock-transfer.service';
import { PrismaService } from '../prisma/prisma.service';
import { StockTransferStatus } from '../generated/prisma/client';
import type { AuthenticatedUser } from '../auth/auth.types';

const subA: AuthenticatedUser = {
  sub: 'u-a',
  email: 'a@filiale.local',
  organisationId: 'org-a',
  organizationType: 'SUBSIDIARY',
  organizationSlug: 'filiale-a',
  firstLogin: false,
  role: { id: 'r1', name: 'MANAGER', description: null, poleCode: null },
};

const subB: AuthenticatedUser = {
  ...subA,
  sub: 'u-b',
  email: 'b@filiale.local',
  organisationId: 'org-b',
  organizationSlug: 'filiale-b',
};

describe('StockTransferService', () => {
  let service: StockTransferService;
  let create: jest.Mock;
  let findUnique: jest.Mock;
  let update: jest.Mock;

  beforeEach(async () => {
    create = jest.fn().mockImplementation(async ({ data }) => ({
      id: 'tr-1',
      ...data,
      status: StockTransferStatus.PENDING,
      product: { id: data.productId, name: 'P' },
      fromOrganization: {
        id: data.fromOrganizationId,
        name: 'A',
        slug: 'a',
        organizationType: 'SUBSIDIARY',
      },
      toOrganization: {
        id: data.toOrganizationId,
        name: 'B',
        slug: 'b',
        organizationType: 'SUBSIDIARY',
      },
      requestedBy: null,
    }));
    findUnique = jest.fn();
    update = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockTransferService,
        {
          provide: PrismaService,
          useValue: {
            stockTransfer: { create, findUnique, findMany: jest.fn(), update },
            organization: {
              findUnique: jest.fn().mockResolvedValue({
                organizationType: 'SUBSIDIARY',
              }),
            },
            stock: { findUnique: jest.fn().mockResolvedValue({ quantity: 10 }) },
            $transaction: jest.fn((fn: (tx: unknown) => unknown) =>
              fn({
                stockTransfer: { update },
                stock: {
                  update: jest.fn(),
                  upsert: jest.fn(),
                },
                stockMovement: { create: jest.fn() },
              }),
            ),
          },
        },
      ],
    }).compile();
    service = module.get(StockTransferService);
  });

  it('refuse un transfert vers la même organisation', async () => {
    await expect(
      service.create(
        {
          fromOrganizationId: 'org-a',
          toOrganizationId: 'org-a',
          productId: 'p1',
          quantity: 2,
        },
        subA,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuse si la filiale ne demande pas depuis son org', async () => {
    await expect(
      service.create(
        {
          fromOrganizationId: 'org-b',
          toOrganizationId: 'org-a',
          productId: 'p1',
          quantity: 2,
        },
        subA,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('crée un transfert en attente', async () => {
    const row = await service.create(
      {
        fromOrganizationId: 'org-a',
        toOrganizationId: 'org-b',
        productId: 'p1',
        quantity: 3,
      },
      subA,
    );
    expect(row.status).toBe(StockTransferStatus.PENDING);
    expect(create).toHaveBeenCalled();
  });
});
