jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { StockMovementService } from './stock-movement.service';
import { PrismaService } from '../prisma/prisma.service';
import { StockMovementType } from '../generated/prisma/client';
import type { AuthenticatedUser } from '../auth/auth.types';

const subsidiaryViewer: AuthenticatedUser = {
  sub: 'u-sub',
  email: 'm@filiale.local',
  organisationId: 'org-sub',
  organizationType: 'SUBSIDIARY',
  organizationSlug: 'filiale',
  firstLogin: false,
  role: { id: 'r1', name: 'MANAGER', description: null, poleCode: null },
};

describe('StockMovementService', () => {
  let service: StockMovementService;
  let findMany: jest.Mock;

  beforeEach(async () => {
    findMany = jest.fn().mockResolvedValue([]);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockMovementService,
        {
          provide: PrismaService,
          useValue: {
            stockMovement: { findMany },
          },
        },
      ],
    }).compile();
    service = module.get(StockMovementService);
  });

  it('liste les mouvements de la filiale connectée', async () => {
    await service.findAll(subsidiaryViewer);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: 'org-sub' }),
        orderBy: { createdAt: 'desc' },
      }),
    );
  });

  it('recordStockMovement crée une ligne via transaction', async () => {
    const create = jest.fn().mockResolvedValue({});
    const tx = { stockMovement: { create } };
    await StockMovementService.recordOnTransaction(tx as never, {
      organizationId: 'org-sub',
      productId: 'p1',
      quantityDelta: -2,
      type: StockMovementType.SALE,
      referenceType: 'Vente',
      referenceId: 'v1',
      recordedByUserId: 'u-sub',
    });
    expect(create).toHaveBeenCalled();
  });
});
