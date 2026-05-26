jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { LeaveRequestService } from './leave-request.service';
import { LeaveBalanceService } from './leave-balance.service';
import { NotificationService } from '../notification/notification.service';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/auth.types';
import { LeaveStatus, LeaveType } from '../generated/prisma/client';

const viewer: AuthenticatedUser = {
  sub: 'u-hr',
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

describe('LeaveRequestService', () => {
  let service: LeaveRequestService;
  let findMany: jest.Mock;
  let findUnique: jest.Mock;
  let create: jest.Mock;
  let update: jest.Mock;
  let employeeFindUnique: jest.Mock;

  beforeEach(async () => {
    findMany = jest.fn();
    findUnique = jest.fn();
    create = jest.fn();
    update = jest.fn();
    employeeFindUnique = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeaveRequestService,
        {
          provide: LeaveBalanceService,
          useValue: {
            ensureForEmployee: jest.fn().mockResolvedValue({ id: 'lb-1' }),
            reserveLeaveDays: jest.fn(),
            releaseLeaveDays: jest.fn(),
          },
        },
        {
          provide: NotificationService,
          useValue: { create: jest.fn() },
        },
        {
          provide: PrismaService,
          useValue: {
            leaveRequest: { findMany, findUnique, create, update },
            employee: { findUnique: employeeFindUnique },
            leaveBalance: {
              findUnique: jest.fn().mockResolvedValue({
                totalDays: 30,
                usedDays: 0,
              }),
            },
          },
        },
      ],
    }).compile();

    service = module.get(LeaveRequestService);
  });

  it('refuse des dates incohérentes', async () => {
    employeeFindUnique.mockResolvedValue({
      id: 'e1',
      organizationId: 'org-sub',
    });
    await expect(
      service.create(
        {
          employeeId: 'e1',
          startDate: new Date('2026-06-10'),
          endDate: new Date('2026-06-01'),
        },
        viewer,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('crée une demande en statut PENDING avec type CP par défaut', async () => {
    employeeFindUnique.mockResolvedValue({
      id: 'e1',
      organizationId: 'org-sub',
    });
    create.mockResolvedValue({ id: 'lr1', status: LeaveStatus.PENDING });
    await service.create(
      {
        employeeId: 'e1',
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-06-05'),
      },
      viewer,
    );
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: LeaveStatus.PENDING,
          type: LeaveType.PAID_LEAVE,
          organizationId: 'org-sub',
        }),
      }),
    );
  });

  it('crée une demande maladie sans contrôle de solde CP', async () => {
    const leaveBalanceFindUnique = jest.fn();
    employeeFindUnique.mockResolvedValue({
      id: 'e1',
      organizationId: 'org-sub',
    });
    const moduleRef = await Test.createTestingModule({
      providers: [
        LeaveRequestService,
        {
          provide: LeaveBalanceService,
          useValue: {
            ensureForEmployee: jest.fn(),
            reserveLeaveDays: jest.fn(),
            releaseLeaveDays: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            leaveRequest: { findMany, findUnique, create, update },
            employee: { findUnique: employeeFindUnique },
            leaveBalance: { findUnique: leaveBalanceFindUnique },
          },
        },
        {
          provide: NotificationService,
          useValue: { create: jest.fn() },
        },
      ],
    }).compile();
    const sickService = moduleRef.get(LeaveRequestService);
    create.mockResolvedValue({ id: 'lr2', status: LeaveStatus.PENDING });
    await sickService.create(
      {
        employeeId: 'e1',
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-06-02'),
        type: 'SICK_LEAVE',
      },
      viewer,
    );
    expect(leaveBalanceFindUnique).not.toHaveBeenCalled();
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: LeaveType.SICK_LEAVE }),
      }),
    );
  });

  it('refuse de valider une demande non PENDING', async () => {
    findUnique.mockResolvedValue({
      id: 'lr1',
      status: LeaveStatus.APPROVED,
      organizationId: 'org-sub',
      employeeId: 'e1',
    });
    await expect(
      service.updateStatus('lr1', { status: 'REJECTED' }, viewer),
    ).rejects.toThrow(BadRequestException);
  });

  it('NotFoundException si demande absente', async () => {
    findUnique.mockResolvedValue(null);
    await expect(
      service.findOne('missing', viewer),
    ).rejects.toThrow(NotFoundException);
  });
});
