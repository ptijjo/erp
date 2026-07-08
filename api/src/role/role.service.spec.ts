import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { RoleService } from './role.service';
import { mockPrismaServiceProvider } from '../test/mocks/prisma-service.mock';
import type { AuthenticatedUser } from '../auth/auth.types';

const mainAdminViewer: AuthenticatedUser = {
  sub: 'u1',
  email: 'admin@vifaa.test',
  organisationId: 'org-main',
  organizationType: 'MAIN',
  organizationSlug: 'vifaa',
  firstLogin: false,
  role: {
    id: 'r-admin',
    name: 'ADMIN',
    description: null,
    poleCode: null,
  },
};

describe('RoleService', () => {
  let service: RoleService;
  let prisma: {
    role: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    organization: { findUnique: jest.Mock };
    pole: { findUnique: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
    role: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
      organization: {
        findUnique: jest.fn().mockResolvedValue({
          organizationType: 'SUBSIDIARY',
        }),
      },
      pole: { findUnique: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [RoleService, mockPrismaServiceProvider(prisma)],
    }).compile();

    service = module.get<RoleService>(RoleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('refuse un doublon de nom dans la même organisation', async () => {
    prisma.role.findFirst.mockResolvedValue({
      id: 'existing',
      name: 'MANAGER',
      organizationScopeId: 'org-subs',
    });

    await expect(
      service.createRole(
        {
          name: 'MANAGER',
          description: 'Gestionnaire',
          organizationScopeId: 'org-subs',
        },
        {
          ...mainAdminViewer,
          role: { ...mainAdminViewer.role, name: 'ADMIN' },
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('autorise le même nom dans une autre organisation', async () => {
    prisma.role.findFirst.mockResolvedValue(null);
    prisma.role.create.mockResolvedValue({
      id: 'new-role',
      name: 'MANAGER',
      organizationScopeId: 'org-other',
    });

    const created = await service.createRole(
      {
        name: 'MANAGER',
        description: 'Gestionnaire',
        organizationScopeId: 'org-other',
      },
      mainAdminViewer,
    );

    expect(created.name).toBe('MANAGER');
    expect(prisma.role.create).toHaveBeenCalled();
  });
});
