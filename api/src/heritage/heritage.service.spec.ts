jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { HeritageService } from './heritage.service';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/auth.types';

const hrStaff: AuthenticatedUser = {
  sub: 'u-hr',
  email: 'hr@vifaa.local',
  organisationId: 'org-main',
  organizationType: 'MAIN',
  organizationSlug: 'vifaa',
  firstLogin: false,
  role: {
    id: 'r1',
    name: 'STAFF_HR',
    description: null,
    poleCode: 'Pole_HR',
  },
};

describe('HeritageService', () => {
  let service: HeritageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HeritageService,
        {
          provide: PrismaService,
          useValue: {
            heritageAsset: {
              findMany: jest.fn().mockResolvedValue([]),
              create: jest.fn(),
            },
            organization: {
              findUnique: jest.fn().mockResolvedValue({ organizationType: 'MAIN' }),
            },
          },
        },
      ],
    }).compile();
    service = module.get(HeritageService);
  });

  it('refuse la création patrimoine hors pôle architecture', async () => {
    await expect(
      service.create(
        {
          organizationId: 'org-main',
          name: 'Site sacré',
        },
        hrStaff,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
