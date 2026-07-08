jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EmployeeDepartureService } from './employee-departure.service';
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

describe('EmployeeDepartureService', () => {
  let service: EmployeeDepartureService;
  let departureFindMany: jest.Mock;
  let departureCount: jest.Mock;
  let departureFindUnique: jest.Mock;
  let departureCreate: jest.Mock;
  let departureDelete: jest.Mock;
  let employeeFindUnique: jest.Mock;
  let employeeUpdate: jest.Mock;
  let txn: jest.Mock;

  beforeEach(async () => {
    departureFindMany = jest.fn().mockResolvedValue([]);
    departureCount = jest.fn().mockResolvedValue(0);
    departureFindUnique = jest.fn();
    departureCreate = jest.fn().mockResolvedValue({ id: 'dep1' });
    departureDelete = jest.fn();
    employeeFindUnique = jest.fn();
    employeeUpdate = jest.fn();

    const client = {
      employeeDeparture: {
        findMany: departureFindMany,
        count: departureCount,
        findUnique: departureFindUnique,
        create: departureCreate,
        delete: departureDelete,
      },
      employee: { findUnique: employeeFindUnique, update: employeeUpdate },
    };
    txn = jest.fn(async (cb: (c: typeof client) => unknown) => cb(client));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeeDepartureService,
        {
          provide: PrismaService,
          useValue: { ...client, $transaction: txn },
        },
      ],
    }).compile();

    service = module.get(EmployeeDepartureService);
  });

  it('liste filtrée par organisation pour la filiale', async () => {
    await service.findAll(subsidiaryViewer, { page: 1, limit: 20 });
    expect(departureFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { organizationId: 'org-sub' } }),
    );
  });

  it('enregistre le départ et passe l’employé en TERMINATED', async () => {
    employeeFindUnique
      .mockResolvedValueOnce({ id: 'e1', organizationId: 'org-sub' }) // cible
      .mockResolvedValueOnce({ id: 'author-1' }); // auteur
    const date = new Date('2026-03-01T00:00:00Z');
    await service.create(
      { employeeId: 'e1', reason: 'RESIGNATION', departureDate: date },
      subsidiaryViewer,
    );
    expect(departureCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          employeeId: 'e1',
          organizationId: 'org-sub',
          reason: 'RESIGNATION',
          recordedById: 'author-1',
        }),
      }),
    );
    expect(employeeUpdate).toHaveBeenCalledWith({
      where: { id: 'e1' },
      data: { status: 'TERMINATED', terminationDate: date },
    });
  });

  it('rejette un employé déjà sorti (P2002)', async () => {
    employeeFindUnique
      .mockResolvedValueOnce({ id: 'e1', organizationId: 'org-sub' })
      .mockResolvedValueOnce(null);
    departureCreate.mockRejectedValue({ code: 'P2002' });
    await expect(
      service.create(
        {
          employeeId: 'e1',
          reason: 'RESIGNATION',
          departureDate: new Date('2026-03-01T00:00:00Z'),
        },
        subsidiaryViewer,
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('lève NotFoundException si départ absent', async () => {
    departureFindUnique.mockResolvedValue(null);
    await expect(service.findOne('missing', subsidiaryViewer)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('supprime un départ et réactive l’employé', async () => {
    departureFindUnique.mockResolvedValue({
      id: 'dep1',
      organizationId: 'org-sub',
      employeeId: 'e1',
    });
    await service.remove('dep1', subsidiaryViewer);
    expect(departureDelete).toHaveBeenCalledWith({ where: { id: 'dep1' } });
    expect(employeeUpdate).toHaveBeenCalledWith({
      where: { id: 'e1' },
      data: { status: 'ACTIVE', terminationDate: null },
    });
  });
});
