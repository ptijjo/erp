jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ActionsService } from './actions.service';
import { PrismaService } from '../prisma/prisma.service';
import { AlertsService } from '../alerts/alerts.service';
import type { AuthenticatedUser } from '../auth/auth.types';
import {
  TaskPriority,
  TaskScope,
  TaskStatus,
} from '../generated/prisma/client';

const subsidiaryUser: AuthenticatedUser = {
  sub: 'u-sub',
  email: 'user@filiale.local',
  organisationId: 'org-sub',
  organizationType: 'SUBSIDIARY',
  organizationSlug: 'filiale-a',
  firstLogin: false,
  role: { id: 'r1', name: 'MANAGER', description: null, poleCode: null },
};

const mainUser: AuthenticatedUser = {
  sub: 'u-main',
  email: 'user@vifaa.local',
  organisationId: 'org-main',
  organizationType: 'MAIN',
  organizationSlug: 'vifaa',
  firstLogin: false,
  role: {
    id: 'r2',
    name: 'DIRECTOR_FINANCE',
    description: null,
    poleCode: 'Pole_FINANCE',
  },
};

describe('ActionsService', () => {
  let service: ActionsService;
  let taskFindMany: jest.Mock;
  let taskFindFirst: jest.Mock;
  let taskCreate: jest.Mock;
  let taskUpdate: jest.Mock;
  let taskDelete: jest.Mock;
  let organizationFindUnique: jest.Mock;
  let getDashboardAlerts: jest.Mock;

  beforeEach(async () => {
    taskFindMany = jest.fn().mockResolvedValue([]);
    taskFindFirst = jest.fn();
    taskCreate = jest.fn();
    taskUpdate = jest.fn();
    taskDelete = jest.fn();
    organizationFindUnique = jest.fn().mockResolvedValue({
      id: 'org-sub',
      organizationType: 'SUBSIDIARY',
    });
    getDashboardAlerts = jest.fn().mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActionsService,
        {
          provide: PrismaService,
          useValue: {
            task: {
              findMany: taskFindMany,
              findFirst: taskFindFirst,
              create: taskCreate,
              update: taskUpdate,
              delete: taskDelete,
            },
            organization: { findUnique: organizationFindUnique },
            leaveRequest: { findMany: jest.fn().mockResolvedValue([]) },
            budget: { findMany: jest.fn().mockResolvedValue([]) },
          },
        },
        {
          provide: AlertsService,
          useValue: { getDashboardAlerts },
        },
      ],
    }).compile();
    service = module.get(ActionsService);
  });

  it('refuse la création sur une organisation inaccessible', async () => {
    organizationFindUnique.mockResolvedValue({
      id: 'org-other',
      organizationType: 'SUBSIDIARY',
    });

    await expect(
      service.createTask(
        {
          title: 'Relancer fournisseur',
          organizationId: 'org-other',
        },
        subsidiaryUser,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('refuse une tâche pôle sans code pôle', async () => {
    organizationFindUnique.mockResolvedValue({
      id: 'org-main',
      organizationType: 'MAIN',
    });

    await expect(
      service.createTask(
        {
          title: 'Revue trimestrielle',
          organizationId: 'org-main',
          scope: TaskScope.POLE,
        },
        mainUser,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('crée une tâche utilisateur avec statut TODO par défaut', async () => {
    organizationFindUnique.mockResolvedValue({
      id: 'org-sub',
      organizationType: 'SUBSIDIARY',
    });
    taskCreate.mockResolvedValue({
      id: 't1',
      title: 'Appeler client',
      status: TaskStatus.TODO,
      priority: TaskPriority.NORMAL,
      scope: TaskScope.USER,
      dueDate: null,
      completedAt: null,
      organizationId: 'org-sub',
      assigneeUserId: null,
      createdByUserId: subsidiaryUser.sub,
      poleCode: null,
      createdAt: new Date('2026-07-01'),
      updatedAt: new Date('2026-07-01'),
      organization: { name: 'Filiale A' },
      assignee: null,
      createdBy: { id: subsidiaryUser.sub, firstName: 'Jean', lastName: 'Dupont' },
    });

    const row = await service.createTask(
      { title: 'Appeler client', organizationId: 'org-sub' },
      subsidiaryUser,
    );

    expect(row.status).toBe(TaskStatus.TODO);
    expect(taskCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'Appeler client',
          status: TaskStatus.TODO,
          createdByUserId: subsidiaryUser.sub,
        }),
      }),
    );
  });

  it('refuse la modification d’une tâche hors visibilité', async () => {
    taskFindFirst.mockResolvedValue(null);

    await expect(
      service.updateTask('missing', { title: 'X' }, subsidiaryUser),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('agrège les alertes système dans la liste', async () => {
    getDashboardAlerts.mockResolvedValue([
      {
        code: 'STOCK_LOW',
        severity: 'warning',
        title: 'Stock bas',
        message: '3 produit(s) sous le seuil minimum.',
        href: '/dashboard/stocks',
        count: 3,
      },
    ]);

    const items = await service.listActions(subsidiaryUser);

    expect(items.some((i) => i.id === 'system:STOCK_LOW')).toBe(true);
    expect(items.find((i) => i.id === 'system:STOCK_LOW')?.kind).toBe('SYSTEM');
    expect(items.find((i) => i.id === 'system:STOCK_LOW')?.editable).toBe(false);
  });
});
