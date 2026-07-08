jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SessionCaisseService } from './session-caisse.service';
import { PrismaService } from '../prisma/prisma.service';
import { SessionCaisseStatut } from '../generated/prisma/client';
import type { AuthenticatedUser } from '../auth/auth.types';

const subsidiaryViewer: AuthenticatedUser = {
  sub: 'u-sub',
  email: 'caisse@filiale.local',
  organisationId: 'org-sub',
  organizationType: 'SUBSIDIARY',
  organizationSlug: 'filiale',
  firstLogin: false,
  role: { id: 'r1', name: 'MANAGER', description: null, poleCode: null },
};

describe('SessionCaisseService', () => {
  let service: SessionCaisseService;
  let findFirst: jest.Mock;
  let create: jest.Mock;
  let catalogCategoryCount: jest.Mock;
  let catalogProductCount: jest.Mock;

  beforeEach(async () => {
    findFirst = jest.fn().mockResolvedValue(null);
    create = jest.fn().mockImplementation(async ({ data }) => ({
      id: 'sess-1',
      statut: SessionCaisseStatut.OUVERTE,
      fondOuverture: data.fondOuverture,
      organizationId: 'org-sub',
      userId: 'u-sub',
      ventes: [],
      organization: { id: 'org-sub', name: 'F', slug: 'f', organizationType: 'SUBSIDIARY' },
      user: { id: 'u-sub', email: 'x@y.z', firstName: null, lastName: null },
      closedBy: null,
    }));
    catalogCategoryCount = jest.fn().mockResolvedValue(1);
    catalogProductCount = jest.fn().mockResolvedValue(0);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionCaisseService,
        {
          provide: PrismaService,
          useValue: {
            sessionCaisse: { findFirst, create, findUnique: jest.fn() },
            vente: { count: jest.fn() },
            organizationCatalogCategory: { count: catalogCategoryCount },
            organizationCatalogProduct: { count: catalogProductCount },
          },
        },
      ],
    }).compile();

    service = module.get(SessionCaisseService);
  });

  it('refuse une deuxième ouverture si session déjà ouverte', async () => {
    findFirst.mockResolvedValueOnce({ id: 'existing' });
    await expect(
      service.open({ fondOuverture: 1000 }, subsidiaryViewer),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(create).not.toHaveBeenCalled();
  });

  it('refuse l’ouverture sans catalogue vente assigné', async () => {
    catalogCategoryCount.mockResolvedValue(0);
    catalogProductCount.mockResolvedValue(0);
    await expect(
      service.open({ fondOuverture: 1000 }, subsidiaryViewer),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(create).not.toHaveBeenCalled();
  });

  it('ouvre une session avec le fond saisi', async () => {
    const result = await service.open({ fondOuverture: 7500 }, subsidiaryViewer);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          fondOuverture: 7500,
          organizationId: 'org-sub',
          userId: 'u-sub',
        }),
      }),
    );
    expect(result.live.theoriqueCaisseEspecesFcfa).toBe(7500);
  });
});
