jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ProductionService } from './production.service';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/auth.types';

const legalStaff: AuthenticatedUser = {
  sub: 'u-legal',
  email: 'legal@vifaa.local',
  organisationId: 'org-main',
  organizationType: 'MAIN',
  organizationSlug: 'vifaa',
  firstLogin: false,
  role: {
    id: 'r1',
    name: 'STAFF_LEGAL',
    description: null,
    poleCode: 'Pole_LEGAL',
  },
};

describe('ProductionService', () => {
  let service: ProductionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionService,
        {
          provide: PrismaService,
          useValue: {
            productionOrder: {
              findMany: jest.fn().mockResolvedValue([]),
              create: jest.fn(),
            },
          },
        },
      ],
    }).compile();
    service = module.get(ProductionService);
  });

  it('refuse la création production hors pôle production', async () => {
    await expect(
      service.create(
        {
          organizationId: 'org-main',
          title: 'Lot A',
          quantity: 10,
        },
        legalStaff,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
