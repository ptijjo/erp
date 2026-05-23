jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { LeaveBalanceService } from './leave-balance.service';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/auth.types';
import { LEAVE_ANNUAL_ENTITLEMENT_DAYS } from './leave-balance.rules';

const viewer: AuthenticatedUser = {
  sub: 'u-hr',
  email: 'drh@test.local',
  organisationId: 'org-1',
  organizationType: 'MAIN',
  organizationSlug: 'vifaa',
  firstLogin: false,
  role: {
    id: 'r1',
    name: 'DIRECTOR_HR',
    description: null,
    poleCode: 'Pole_HR',
  },
};

describe('LeaveBalanceService', () => {
  let service: LeaveBalanceService;
  let findMany: jest.Mock;
  let findUnique: jest.Mock;
  let create: jest.Mock;

  beforeEach(async () => {
    findMany = jest.fn();
    findUnique = jest.fn();
    create = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeaveBalanceService,
        {
          provide: PrismaService,
          useValue: {
            employee: {
              findUnique: jest.fn().mockResolvedValue({
                id: 'emp-1',
                organizationId: 'org-1',
              }),
            },
            leaveBalance: { findMany, findUnique, create, count: jest.fn() },
          },
        },
      ],
    }).compile();

    service = module.get(LeaveBalanceService);
  });

  it('crée un solde avec 30 j + cumul pour un nouvel exercice', async () => {
    findMany.mockResolvedValue([
      { year: 2025, totalDays: 30, usedDays: 27 },
    ]);
    findUnique.mockResolvedValue(null);
    create.mockResolvedValue({
      id: 'lb-1',
      year: 2026,
      totalDays: 33,
      usedDays: 0,
      employeeId: 'emp-1',
      organizationId: 'org-1',
    });

    await service.ensureForEmployee(
      'emp-1',
      viewer,
      new Date('2026-06-01'),
    );

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          employeeId: 'emp-1',
          organizationId: 'org-1',
          year: 2026,
          totalDays: LEAVE_ANNUAL_ENTITLEMENT_DAYS + 3,
          usedDays: 0,
        },
      }),
    );
  });

  it('retourne le solde existant sans recréer', async () => {
    const existing = {
      id: 'lb-existing',
      year: 2026,
      totalDays: 33,
      usedDays: 2,
      employeeId: 'emp-1',
      organizationId: 'org-1',
    };
    findMany.mockResolvedValue([existing]);
    findUnique.mockResolvedValue(existing);

    const result = await service.ensureForEmployee(
      'emp-1',
      viewer,
      new Date('2026-06-01'),
    );

    expect(create).not.toHaveBeenCalled();
    expect(result.id).toBe('lb-existing');
  });

  it('mappe P2002 en ConflictException si exercice déjà présent', async () => {
    findMany.mockResolvedValue([]);
    create.mockRejectedValue({ code: 'P2002' });

    await expect(
      service.create(
        { employeeId: 'emp-1', year: 2026, totalDays: 30 },
        viewer,
      ),
    ).rejects.toThrow(ConflictException);
  });
});
