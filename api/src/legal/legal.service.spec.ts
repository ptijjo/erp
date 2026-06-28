jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { LegalService } from './legal.service';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/auth.types';

const heritageStaff: AuthenticatedUser = {
  sub: 'u-heritage',
  email: 'heritage@vifaa.local',
  organisationId: 'org-main',
  organizationType: 'MAIN',
  organizationSlug: 'vifaa',
  firstLogin: false,
  role: {
    id: 'r1',
    name: 'STAFF_HERITAGE',
    description: null,
    poleCode: 'Pole_ARCHITECTURE_HERITAGE',
  },
};

describe('LegalService', () => {
  let service: LegalService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LegalService,
        {
          provide: PrismaService,
          useValue: {
            legalContract: {
              findMany: jest.fn().mockResolvedValue([]),
              create: jest.fn(),
            },
          },
        },
      ],
    }).compile();
    service = module.get(LegalService);
  });

  it('refuse la création juridique hors pôle legal', async () => {
    await expect(
      service.create(
        {
          organizationId: 'org-main',
          title: 'Contrat test',
          partyName: 'Partenaire',
        },
        heritageStaff,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
