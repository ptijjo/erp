jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { RecurringWorkShiftService } from './recurring-work-shift.service';
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

describe('RecurringWorkShiftService', () => {
  let service: RecurringWorkShiftService;
  let findMany: jest.Mock;
  let findUnique: jest.Mock;
  let create: jest.Mock;
  let update: jest.Mock;
  let deleteFn: jest.Mock;
  let employeeFindUnique: jest.Mock;

  beforeEach(async () => {
    findMany = jest.fn().mockResolvedValue([]);
    findUnique = jest.fn();
    create = jest.fn().mockResolvedValue({ id: 'r1' });
    update = jest.fn();
    deleteFn = jest.fn();
    employeeFindUnique = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecurringWorkShiftService,
        {
          provide: PrismaService,
          useValue: {
            recurringWorkShift: {
              findMany,
              findUnique,
              create,
              update,
              delete: deleteFn,
            },
            employee: { findUnique: employeeFindUnique },
          },
        },
      ],
    }).compile();

    service = module.get(RecurringWorkShiftService);
  });

  it('interdit la maison mère', async () => {
    await expect(service.findAll(mainViewer, {})).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('liste les modèles de la filiale', async () => {
    await service.findAll(subsidiaryViewer, {});
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { organizationId: 'org-sub' } }),
    );
  });

  it('refuse une plage horaire invalide', async () => {
    employeeFindUnique.mockResolvedValue({ id: 'e1', organizationId: 'org-sub' });
    await expect(
      service.create(
        { employeeId: 'e1', dayOfWeek: 'MONDAY', startMinute: 1020, endMinute: 480 },
        subsidiaryViewer,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('crée un modèle rattaché à l’organisation de l’employé', async () => {
    employeeFindUnique.mockResolvedValue({ id: 'e1', organizationId: 'org-sub' });
    await service.create(
      { employeeId: 'e1', dayOfWeek: 'MONDAY', startMinute: 480, endMinute: 1020 },
      subsidiaryViewer,
    );
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          employeeId: 'e1',
          organizationId: 'org-sub',
          dayOfWeek: 'MONDAY',
          startMinute: 480,
          endMinute: 1020,
          active: true,
        }),
      }),
    );
  });

  it('lève NotFoundException si le modèle est absent', async () => {
    findUnique.mockResolvedValue(null);
    await expect(service.findOne('missing', subsidiaryViewer)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('supprime un modèle de la filiale', async () => {
    findUnique.mockResolvedValue({ id: 'r1', organizationId: 'org-sub' });
    await service.remove('r1', subsidiaryViewer);
    expect(deleteFn).toHaveBeenCalledWith({ where: { id: 'r1' } });
  });
});
