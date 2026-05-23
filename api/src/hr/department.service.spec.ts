jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DepartmentService } from './department.service';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/auth.types';

const mainViewer: AuthenticatedUser = {
  sub: 'u-main',
  email: 'drh@vifaa.local',
  organisationId: 'org-main',
  organizationType: 'MAIN',
  organizationSlug: 'vifaa',
  firstLogin: false,
  role: {
    id: 'r-hr',
    name: 'DIRECTOR_HR',
    description: null,
    poleCode: 'Pole_HR',
  },
};

const subsidiaryViewer: AuthenticatedUser = {
  ...mainViewer,
  sub: 'u-sub',
  organisationId: 'org-sub',
  organizationType: 'SUBSIDIARY',
  organizationSlug: 'filiale',
  role: { ...mainViewer.role, name: 'MANAGER_FILIALE', poleCode: null },
};

describe('DepartmentService', () => {
  let service: DepartmentService;
  let findMany: jest.Mock;
  let count: jest.Mock;
  let findUnique: jest.Mock;
  let create: jest.Mock;
  let update: jest.Mock;
  let deleteFn: jest.Mock;

  beforeEach(async () => {
    findMany = jest.fn();
    count = jest.fn().mockResolvedValue(0);
    findUnique = jest.fn();
    create = jest.fn();
    update = jest.fn();
    deleteFn = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DepartmentService,
        {
          provide: PrismaService,
          useValue: {
            department: {
              findMany,
              count,
              findUnique,
              create,
              update,
              delete: deleteFn,
            },
          },
        },
      ],
    }).compile();

    service = module.get(DepartmentService);
  });

  it('liste filtrée par organisation pour une filiale', async () => {
    findMany.mockResolvedValue([]);
    count.mockResolvedValue(0);
    const result = await service.findAll(subsidiaryViewer, { page: 1, limit: 20 });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: 'org-sub' },
        skip: 0,
        take: 20,
      }),
    );
    expect(result).toEqual({
      items: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });
  });

  it('plafonne la taille de page à 20', async () => {
    findMany.mockResolvedValue([]);
    count.mockResolvedValue(50);
    await service.findAll(mainViewer, { page: 2, limit: 100 });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 20 }),
    );
  });

  it('refuse la création filiale avec un organizationId différent', async () => {
    await expect(
      service.create(
        { name: 'RH', organizationId: 'org-other' },
        subsidiaryViewer,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('crée un département pour la filiale connectée', async () => {
    create.mockResolvedValue({ id: 'd1', name: 'RH', organizationId: 'org-sub' });
    await service.create({ name: 'RH' }, subsidiaryViewer);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { name: 'RH', organizationId: 'org-sub' },
      }),
    );
  });

  it('exige organizationId pour la maison mère', async () => {
    await expect(
      service.create({ name: 'RH' }, mainViewer),
    ).rejects.toThrow('organizationId');
  });

  it('lève NotFoundException si département absent', async () => {
    findUnique.mockResolvedValue(null);
    await expect(service.findOne('missing', mainViewer)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('mappe P2002 en ConflictException à la création', async () => {
    create.mockRejectedValue({ code: 'P2002' });
    await expect(
      service.create(
        { name: 'RH', organizationId: 'org-sub' },
        mainViewer,
      ),
    ).rejects.toThrow(ConflictException);
  });
});
