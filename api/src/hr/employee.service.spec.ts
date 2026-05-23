jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EmployeeService } from './employee.service';
import { LeaveBalanceService } from './leave-balance.service';
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
  organisationId: 'org-sub',
  organizationType: 'SUBSIDIARY',
  organizationSlug: 'filiale',
};

const hireDate = new Date('2024-01-15');

describe('EmployeeService', () => {
  let service: EmployeeService;
  let employeeFindMany: jest.Mock;
  let employeeCount: jest.Mock;
  let employeeFindUnique: jest.Mock;
  let employeeCreate: jest.Mock;
  let employeeUpdate: jest.Mock;
  let employeeDelete: jest.Mock;
  let departmentFindUnique: jest.Mock;
  let userFindUnique: jest.Mock;

  beforeEach(async () => {
    employeeFindMany = jest.fn();
    employeeCount = jest.fn().mockResolvedValue(0);
    employeeFindUnique = jest.fn();
    employeeCreate = jest.fn();
    employeeUpdate = jest.fn();
    employeeDelete = jest.fn();
    departmentFindUnique = jest.fn();
    userFindUnique = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeeService,
        {
          provide: LeaveBalanceService,
          useValue: {
            ensureForEmployee: jest.fn().mockResolvedValue({ id: 'lb-1' }),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            employee: {
              findMany: employeeFindMany,
              count: employeeCount,
              findUnique: employeeFindUnique,
              create: employeeCreate,
              update: employeeUpdate,
              delete: employeeDelete,
            },
            department: { findUnique: departmentFindUnique },
            user: { findUnique: userFindUnique },
          },
        },
      ],
    }).compile();

    service = module.get(EmployeeService);
  });

  it('filtre la liste par organisation pour une filiale', async () => {
    employeeFindMany.mockResolvedValue([]);
    employeeCount.mockResolvedValue(0);
    await service.findAll(subsidiaryViewer, { page: 1, limit: 20 });
    expect(employeeFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: 'org-sub' },
        skip: 0,
        take: 20,
      }),
    );
  });

  it('filtre par recherche textuelle', async () => {
    employeeFindMany.mockResolvedValue([]);
    employeeCount.mockResolvedValue(0);
    await service.findAll(mainViewer, { search: 'ada' });
    expect(employeeFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({
              firstName: { contains: 'ada', mode: 'insensitive' },
            }),
          ]),
        }),
      }),
    );
  });

  it('refuse un département d’une autre organisation', async () => {
    departmentFindUnique.mockResolvedValue({
      id: 'dep-1',
      organizationId: 'org-other',
      name: 'Autre',
    });
    await expect(
      service.create(
        {
          firstName: 'Ada',
          lastName: 'Lovelace',
          hireDate,
          departmentId: 'dep-1',
        },
        subsidiaryViewer,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('crée un employé rattaché à la filiale', async () => {
    employeeCreate.mockResolvedValue({
      id: 'e1',
      firstName: 'Ada',
      lastName: 'Lovelace',
      organizationId: 'org-sub',
      hireDate,
    });
    await service.create(
      { firstName: 'Ada', lastName: 'Lovelace', hireDate },
      subsidiaryViewer,
    );
    expect(employeeCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ organizationId: 'org-sub' }),
      }),
    );
  });

  it('refuse un userId déjà lié à un autre employé', async () => {
    userFindUnique.mockResolvedValue({
      id: 'user-1',
      organizationId: 'org-sub',
    });
    employeeFindUnique.mockResolvedValue({ id: 'other-emp' });
    await expect(
      service.create(
        {
          firstName: 'Ada',
          lastName: 'Lovelace',
          hireDate,
          userId: 'user-1',
        },
        subsidiaryViewer,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('NotFoundException si employé absent', async () => {
    employeeFindUnique.mockResolvedValue(null);
    await expect(service.findOne('x', mainViewer)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('ForbiddenException si filiale accède à une autre org', async () => {
    employeeFindUnique.mockResolvedValue({
      id: 'e1',
      organizationId: 'org-other',
    });
    await expect(service.findOne('e1', subsidiaryViewer)).rejects.toThrow(
      ForbiddenException,
    );
  });
});
