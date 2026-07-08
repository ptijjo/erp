import { Test, TestingModule } from '@nestjs/testing';
import { DirectoryService } from './directory.service';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/auth.types';
import { EmployeeStatus } from '../generated/prisma/client';

const viewer: AuthenticatedUser = {
  sub: 'u1',
  email: 'a@test.local',
  organisationId: 'org-sub',
  organizationType: 'SUBSIDIARY',
  organizationSlug: 'filiale',
  firstLogin: false,
  role: { id: 'r1', name: 'MANAGER', description: null, poleCode: null },
};

describe('DirectoryService', () => {
  let service: DirectoryService;
  let employeeFindMany: jest.Mock;
  let userFindMany: jest.Mock;

  beforeEach(async () => {
    employeeFindMany = jest.fn().mockResolvedValue([]);
    userFindMany = jest.fn().mockResolvedValue([]);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DirectoryService,
        {
          provide: PrismaService,
          useValue: {
            employee: { findMany: employeeFindMany },
            user: { findMany: userFindMany },
          },
        },
      ],
    }).compile();
    service = module.get(DirectoryService);
  });

  it('retourne une liste vide si la requête est vide', async () => {
    const result = await service.search(viewer, '  ');
    expect(result).toEqual([]);
    expect(employeeFindMany).not.toHaveBeenCalled();
    expect(userFindMany).not.toHaveBeenCalled();
  });

  it('filtre les employés actifs de l’organisation filiale', async () => {
    await service.search(viewer, 'dupont', 10);
    expect(employeeFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: EmployeeStatus.ACTIVE,
          organizationId: 'org-sub',
        }),
        take: 10,
      }),
    );
  });

  it('inclut les utilisateurs sans fiche employé (recherche par rôle)', async () => {
    userFindMany.mockResolvedValue([
      {
        id: 'u-comptable',
        email: 'test@test.com',
        firstName: 'test',
        lastName: null,
        profilePhotoUrl: null,
        organization: { id: 'org-main', name: 'VIFAA', slug: 'vifaa' },
        role: {
          name: 'COMPTABLE',
          pole: { code: 'Pole_FINANCE', name: 'Pôle finances' },
        },
      },
    ]);
    const mainViewer: AuthenticatedUser = {
      ...viewer,
      organisationId: 'org-main',
      organizationType: 'MAIN',
      organizationSlug: 'vifaa',
    };
    const result = await service.search(mainViewer, 'comptable', 20);
    expect(userFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deletedAt: null,
          employee: { is: null },
        }),
      }),
    );
    expect(result).toHaveLength(1);
    expect(result[0]?.role?.name).toBe('COMPTABLE');
    expect(result[0]?.employeeId).toBeNull();
  });
});
