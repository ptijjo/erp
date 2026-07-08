jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { WorkShiftService } from './work-shift.service';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/auth.types';

const subsidiaryViewer: AuthenticatedUser = {
  sub: 'u-sub',
  email: 'directeur@filiale.local',
  organisationId: 'org-sub',
  organizationType: 'SUBSIDIARY',
  organizationSlug: 'filiale',
  firstLogin: false,
  role: {
    id: 'r-dir',
    name: 'DIRECTOR_FILIALE',
    description: null,
    poleCode: null,
  },
};

const mainViewer: AuthenticatedUser = {
  ...subsidiaryViewer,
  sub: 'u-main',
  organisationId: 'org-main',
  organizationType: 'MAIN',
  organizationSlug: 'vifaa',
  role: { id: 'r-hr', name: 'DIRECTOR_HR', description: null, poleCode: 'Pole_HR' },
};

describe('WorkShiftService', () => {
  let service: WorkShiftService;
  let shiftFindMany: jest.Mock;
  let shiftCount: jest.Mock;
  let shiftFindUnique: jest.Mock;
  let shiftCreate: jest.Mock;
  let shiftCreateMany: jest.Mock;
  let shiftUpdate: jest.Mock;
  let shiftDelete: jest.Mock;
  let employeeFindUnique: jest.Mock;
  let recurringFindMany: jest.Mock;

  beforeEach(async () => {
    shiftFindMany = jest.fn().mockResolvedValue([]);
    shiftCount = jest.fn().mockResolvedValue(0);
    shiftFindUnique = jest.fn();
    shiftCreate = jest.fn();
    shiftCreateMany = jest.fn().mockResolvedValue({ count: 0 });
    shiftUpdate = jest.fn();
    shiftDelete = jest.fn();
    employeeFindUnique = jest.fn();
    recurringFindMany = jest.fn().mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkShiftService,
        {
          provide: PrismaService,
          useValue: {
            workShift: {
              findMany: shiftFindMany,
              count: shiftCount,
              findUnique: shiftFindUnique,
              create: shiftCreate,
              createMany: shiftCreateMany,
              update: shiftUpdate,
              delete: shiftDelete,
            },
            recurringWorkShift: { findMany: recurringFindMany },
            employee: { findUnique: employeeFindUnique },
          },
        },
      ],
    }).compile();

    service = module.get(WorkShiftService);
  });

  it('interdit la maison mère de lister le planning', async () => {
    await expect(
      service.findAll(mainViewer, { page: 1, limit: 20 }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('liste les créneaux filtrés par organisation de la filiale', async () => {
    shiftFindMany.mockResolvedValue([]);
    shiftCount.mockResolvedValue(0);
    await service.findAll(subsidiaryViewer, { page: 1, limit: 20 });
    expect(shiftFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: 'org-sub' },
        skip: 0,
        take: 20,
      }),
    );
  });

  it('filtre par employeeId quand fourni', async () => {
    await service.findAll(subsidiaryViewer, { page: 1, limit: 20, employeeId: 'e1' });
    expect(shiftFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: 'org-sub', employeeId: 'e1' },
      }),
    );
  });

  it('interdit la maison mère de créer un créneau', async () => {
    await expect(
      service.create(
        { employeeId: 'e1', startAt: new Date('2026-01-01T08:00:00Z'), endAt: new Date('2026-01-01T17:00:00Z') },
        mainViewer,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('refuse une plage horaire invalide', async () => {
    employeeFindUnique.mockResolvedValue({ id: 'e1', organizationId: 'org-sub' });
    await expect(
      service.create(
        { employeeId: 'e1', startAt: new Date('2026-01-01T17:00:00Z'), endAt: new Date('2026-01-01T08:00:00Z') },
        subsidiaryViewer,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('refuse un employé hors périmètre de la filiale', async () => {
    employeeFindUnique.mockResolvedValue({ id: 'e1', organizationId: 'org-other' });
    await expect(
      service.create(
        { employeeId: 'e1', startAt: new Date('2026-01-01T08:00:00Z'), endAt: new Date('2026-01-01T17:00:00Z') },
        subsidiaryViewer,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('crée un créneau rattaché à l’organisation de l’employé', async () => {
    employeeFindUnique.mockResolvedValue({ id: 'e1', organizationId: 'org-sub' });
    shiftCreate.mockResolvedValue({ id: 's1' });
    await service.create(
      {
        employeeId: 'e1',
        startAt: new Date('2026-01-01T08:00:00Z'),
        endAt: new Date('2026-01-01T17:00:00Z'),
        note: '  Matinée  ',
      },
      subsidiaryViewer,
    );
    expect(shiftCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          employeeId: 'e1',
          organizationId: 'org-sub',
          status: 'PLANNED',
          note: 'Matinée',
        }),
      }),
    );
  });

  it('lève NotFoundException si le créneau est absent', async () => {
    shiftFindUnique.mockResolvedValue(null);
    await expect(service.findOne('missing', subsidiaryViewer)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('supprime un créneau de la filiale', async () => {
    shiftFindUnique.mockResolvedValue({ id: 's1', organizationId: 'org-sub' });
    shiftDelete.mockResolvedValue({ id: 's1' });
    await service.remove('s1', subsidiaryViewer);
    expect(shiftDelete).toHaveBeenCalledWith({ where: { id: 's1' } });
  });

  it('renvoie le calendrier d’une plage pour la filiale', async () => {
    shiftFindMany.mockResolvedValue([{ id: 's1' }]);
    const from = new Date('2026-01-05T00:00:00Z');
    const to = new Date('2026-01-06T00:00:00Z');
    const result = await service.findCalendar(subsidiaryViewer, { from, to });
    expect(shiftFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: 'org-sub',
          startAt: { gte: from, lt: to },
        }),
      }),
    );
    expect(result).toEqual([{ id: 's1' }]);
  });

  it('interdit la maison mère d’accéder au calendrier', async () => {
    await expect(
      service.findCalendar(mainViewer, {
        from: new Date('2026-01-05T00:00:00Z'),
        to: new Date('2026-01-06T00:00:00Z'),
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('interdit la maison mère de générer une semaine', async () => {
    await expect(
      service.generateWeek(mainViewer, { weekStart: new Date('2026-01-05T00:00:00Z') }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('génère les créneaux de la semaine depuis les modèles récurrents', async () => {
    recurringFindMany.mockResolvedValue([
      { employeeId: 'e1', dayOfWeek: 'MONDAY', startMinute: 480, endMinute: 1020, note: 'Matin' },
    ]);
    shiftFindMany.mockResolvedValue([]);
    shiftCreateMany.mockResolvedValue({ count: 1 });
    const result = await service.generateWeek(subsidiaryViewer, {
      weekStart: new Date('2026-01-05T00:00:00Z'), // lundi
    });
    expect(shiftCreateMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          employeeId: 'e1',
          organizationId: 'org-sub',
          startAt: new Date('2026-01-05T08:00:00.000Z'),
          endAt: new Date('2026-01-05T17:00:00.000Z'),
          status: 'PLANNED',
          note: 'Matin',
        }),
      ],
    });
    expect(result).toEqual({ created: 1 });
  });

  it('ne recrée pas un créneau déjà présent (dédoublonnage)', async () => {
    recurringFindMany.mockResolvedValue([
      { employeeId: 'e1', dayOfWeek: 'MONDAY', startMinute: 480, endMinute: 1020, note: null },
    ]);
    shiftFindMany.mockResolvedValue([
      { employeeId: 'e1', startAt: new Date('2026-01-05T08:00:00.000Z') },
    ]);
    const result = await service.generateWeek(subsidiaryViewer, {
      weekStart: new Date('2026-01-05T00:00:00Z'),
    });
    expect(shiftCreateMany).not.toHaveBeenCalled();
    expect(result).toEqual({ created: 0 });
  });
});
