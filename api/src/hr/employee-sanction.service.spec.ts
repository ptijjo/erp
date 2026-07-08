jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EmployeeSanctionService } from './employee-sanction.service';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/auth.types';

const subsidiaryViewer: AuthenticatedUser = {
  sub: 'u-sub',
  email: 'directeur@filiale.local',
  organisationId: 'org-sub',
  organizationType: 'SUBSIDIARY',
  organizationSlug: 'filiale',
  firstLogin: false,
  role: { id: 'r-dir', name: 'DIRECTOR_FILIALE', description: null, poleCode: null },
};

const mainViewer: AuthenticatedUser = {
  ...subsidiaryViewer,
  sub: 'u-main',
  organisationId: 'org-main',
  organizationType: 'MAIN',
  organizationSlug: 'vifaa',
  role: { id: 'r-hr', name: 'DIRECTOR_HR', description: null, poleCode: 'Pole_HR' },
};

describe('EmployeeSanctionService', () => {
  let service: EmployeeSanctionService;
  let sanctionFindMany: jest.Mock;
  let sanctionCount: jest.Mock;
  let sanctionFindUnique: jest.Mock;
  let sanctionCreate: jest.Mock;
  let sanctionUpdate: jest.Mock;
  let sanctionDelete: jest.Mock;
  let employeeFindUnique: jest.Mock;
  let employeeUpdate: jest.Mock;

  beforeEach(async () => {
    sanctionFindMany = jest.fn().mockResolvedValue([]);
    sanctionCount = jest.fn().mockResolvedValue(0);
    sanctionFindUnique = jest.fn();
    sanctionCreate = jest.fn().mockResolvedValue({ id: 'sc1' });
    sanctionUpdate = jest.fn();
    sanctionDelete = jest.fn();
    employeeFindUnique = jest.fn();
    employeeUpdate = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeeSanctionService,
        {
          provide: PrismaService,
          useValue: {
            employeeSanction: {
              findMany: sanctionFindMany,
              count: sanctionCount,
              findUnique: sanctionFindUnique,
              create: sanctionCreate,
              update: sanctionUpdate,
              delete: sanctionDelete,
            },
            employee: { findUnique: employeeFindUnique, update: employeeUpdate },
          },
        },
      ],
    }).compile();

    service = module.get(EmployeeSanctionService);
  });

  it('liste sans filtre organisation pour la maison mère', async () => {
    await service.findAll(mainViewer, { page: 1, limit: 20 });
    expect(sanctionFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} }),
    );
  });

  it('liste filtrée par organisation pour la filiale', async () => {
    await service.findAll(subsidiaryViewer, { page: 1, limit: 20 });
    expect(sanctionFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { organizationId: 'org-sub' } }),
    );
  });

  it('refuse une date de fin antérieure au début', async () => {
    employeeFindUnique.mockResolvedValue({ id: 'e1', organizationId: 'org-sub' });
    await expect(
      service.create(
        {
          employeeId: 'e1',
          type: 'SUSPENSION',
          reason: 'Retards répétés',
          startDate: new Date('2026-02-10T00:00:00Z'),
          endDate: new Date('2026-02-01T00:00:00Z'),
        },
        subsidiaryViewer,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('crée une sanction et lie l’auteur (employé viewer)', async () => {
    employeeFindUnique
      .mockResolvedValueOnce({ id: 'e1', organizationId: 'org-sub' }) // cible
      .mockResolvedValueOnce({ id: 'author-1' }); // auteur (lien user)
    await service.create(
      {
        employeeId: 'e1',
        type: 'WARNING',
        reason: 'Avertissement',
        startDate: new Date('2026-02-01T00:00:00Z'),
      },
      subsidiaryViewer,
    );
    expect(sanctionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          employeeId: 'e1',
          organizationId: 'org-sub',
          type: 'WARNING',
          decidedById: 'author-1',
        }),
      }),
    );
  });

  it('passe l’employé en SUSPENDED lors d’une mise à pied', async () => {
    employeeFindUnique
      .mockResolvedValueOnce({ id: 'e1', organizationId: 'org-sub' })
      .mockResolvedValueOnce(null);
    await service.create(
      {
        employeeId: 'e1',
        type: 'SUSPENSION',
        reason: 'Mise à pied disciplinaire',
        startDate: new Date('2026-02-01T00:00:00Z'),
        endDate: new Date('2026-02-08T00:00:00Z'),
      },
      subsidiaryViewer,
    );
    expect(employeeUpdate).toHaveBeenCalledWith({
      where: { id: 'e1' },
      data: { status: 'SUSPENDED' },
    });
  });

  it('lève NotFoundException si la sanction est absente', async () => {
    sanctionFindUnique.mockResolvedValue(null);
    await expect(service.findOne('missing', mainViewer)).rejects.toThrow(
      NotFoundException,
    );
  });
});
