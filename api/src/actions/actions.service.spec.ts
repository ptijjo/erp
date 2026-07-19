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

  it('expose le créateur dans la liste quand aucun responsable assigné', async () => {
    taskFindMany.mockResolvedValue([
      {
        id: 't-list',
        title: "Finir l'application",
        description: "Finir l'Erp à temps",
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
        scope: TaskScope.ORGANIZATION,
        dueDate: new Date('2026-09-30'),
        completedAt: null,
        organizationId: 'org-main',
        assigneeUserId: null,
        createdByUserId: mainUser.sub,
        poleCode: null,
        createdAt: new Date('2026-07-01'),
        updatedAt: new Date('2026-07-01'),
        organization: { name: 'VIFAA' },
        assignee: null,
        createdBy: {
          id: mainUser.sub,
          email: mainUser.email,
          firstName: 'Admin',
          lastName: 'VIFAA',
          profilePhotoUrl: 'https://cdn.example/photo.webp',
        },
        subtasks: [],
      },
    ]);

    const items = await service.listActions(mainUser);
    const manual = items.find((i) => i.id === 't-list');

    expect(manual?.assignee).toBeNull();
    expect(manual?.createdBy).toEqual({
      id: mainUser.sub,
      email: mainUser.email,
      firstName: 'Admin',
      lastName: 'VIFAA',
      profilePhotoUrl: 'https://cdn.example/photo.webp',
    });
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

  describe('sous-tâches', () => {
    let taskSubtaskCreate: jest.Mock;
    let taskSubtaskUpdate: jest.Mock;
    let taskSubtaskDelete: jest.Mock;
    let taskSubtaskFindFirst: jest.Mock;
    let taskSubtaskAggregate: jest.Mock;

    const visibleTask = {
      id: 't-parent',
      title: 'Livrer ERP',
      description: null,
      status: TaskStatus.TODO,
      priority: TaskPriority.NORMAL,
      scope: TaskScope.USER,
      dueDate: new Date('2026-08-01'),
      completedAt: null,
      organizationId: 'org-sub',
      assigneeUserId: subsidiaryUser.sub,
      createdByUserId: subsidiaryUser.sub,
      poleCode: null,
      createdAt: new Date('2026-07-01'),
      updatedAt: new Date('2026-07-01'),
      organization: { name: 'Filiale A' },
      assignee: null,
      createdBy: {
        id: subsidiaryUser.sub,
        email: subsidiaryUser.email,
        firstName: 'Jean',
        lastName: 'Dupont',
        profilePhotoUrl: null,
      },
      subtasks: [] as Array<{
        id: string;
        title: string;
        status: TaskStatus;
        dueDate: Date | null;
        sortOrder: number;
        completedAt: Date | null;
        createdAt: Date;
      }>,
    };

    beforeEach(async () => {
      taskSubtaskCreate = jest.fn();
      taskSubtaskUpdate = jest.fn();
      taskSubtaskDelete = jest.fn();
      taskSubtaskFindFirst = jest.fn();
      taskSubtaskAggregate = jest.fn().mockResolvedValue({ _max: { sortOrder: 0 } });

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
              taskSubtask: {
                create: taskSubtaskCreate,
                update: taskSubtaskUpdate,
                delete: taskSubtaskDelete,
                findFirst: taskSubtaskFindFirst,
                aggregate: taskSubtaskAggregate,
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

    it('refuse les sous-tâches sur une action système', async () => {
      await expect(
        service.createSubtask(
          'system:STOCK_LOW',
          { title: 'X' },
          subsidiaryUser,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('crée une sous-tâche et synchronise le parent en IN_PROGRESS', async () => {
      const afterCreate = {
        ...visibleTask,
        status: TaskStatus.IN_PROGRESS,
        subtasks: [
          {
            id: 'st1',
            title: 'Maquette',
            status: TaskStatus.TODO,
            dueDate: new Date('2026-07-20'),
            sortOrder: 1,
            completedAt: null,
            createdAt: new Date('2026-07-10'),
          },
        ],
      };
      taskFindFirst
        .mockResolvedValueOnce({ ...visibleTask, subtasks: [] })
        .mockResolvedValueOnce({
          id: 't-parent',
          subtasks: [{ status: TaskStatus.TODO }],
        })
        .mockResolvedValueOnce(afterCreate);
      taskSubtaskCreate.mockResolvedValue({
        id: 'st1',
        title: 'Maquette',
        status: TaskStatus.TODO,
      });
      taskUpdate.mockResolvedValue({});

      const item = await service.createSubtask(
        't-parent',
        { title: 'Maquette', dueDate: '2026-07-20' },
        subsidiaryUser,
      );

      expect(taskSubtaskCreate).toHaveBeenCalled();
      expect(taskUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 't-parent' },
          data: expect.objectContaining({
            status: TaskStatus.IN_PROGRESS,
            completedAt: null,
          }),
        }),
      );
      expect(item.subtaskProgress).toEqual({
        done: 0,
        total: 1,
        percent: 0,
      });
      expect(item.subtasks).toHaveLength(1);
    });

    it('passe le parent en DONE quand toutes les sous-tâches sont terminées', async () => {
      const afterUpdate = {
        ...visibleTask,
        status: TaskStatus.DONE,
        completedAt: new Date('2026-07-15'),
        subtasks: [
          {
            id: 'st1',
            title: 'A',
            status: TaskStatus.DONE,
            dueDate: null,
            sortOrder: 0,
            completedAt: new Date('2026-07-15'),
            createdAt: new Date(),
          },
        ],
      };
      taskFindFirst
        .mockResolvedValueOnce({
          ...visibleTask,
          subtasks: [
            {
              id: 'st1',
              title: 'A',
              status: TaskStatus.TODO,
              dueDate: null,
              sortOrder: 0,
              completedAt: null,
              createdAt: new Date(),
            },
          ],
        })
        .mockResolvedValueOnce({
          id: 't-parent',
          subtasks: [{ status: TaskStatus.DONE }],
        })
        .mockResolvedValueOnce(afterUpdate);
      taskSubtaskFindFirst.mockResolvedValue({
        id: 'st1',
        taskId: 't-parent',
        completedAt: null,
      });
      taskSubtaskUpdate.mockResolvedValue({});
      taskUpdate.mockResolvedValue({});

      const item = await service.updateSubtask(
        't-parent',
        'st1',
        { status: TaskStatus.DONE },
        subsidiaryUser,
      );

      expect(taskUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: TaskStatus.DONE,
          }),
        }),
      );
      expect(item.subtaskProgress).toEqual({
        done: 1,
        total: 1,
        percent: 100,
      });
    });

    it('supprime une sous-tâche et recalcule la progression', async () => {
      const afterDelete = {
        ...visibleTask,
        status: TaskStatus.DONE,
        completedAt: new Date(),
        subtasks: [
          {
            id: 'st1',
            title: 'A',
            status: TaskStatus.DONE,
            dueDate: null,
            sortOrder: 0,
            completedAt: null,
            createdAt: new Date(),
          },
        ],
      };
      taskFindFirst
        .mockResolvedValueOnce({
          ...visibleTask,
          subtasks: [
            {
              id: 'st1',
              title: 'A',
              status: TaskStatus.DONE,
              dueDate: null,
              sortOrder: 0,
              completedAt: null,
              createdAt: new Date(),
            },
            {
              id: 'st2',
              title: 'B',
              status: TaskStatus.TODO,
              dueDate: null,
              sortOrder: 1,
              completedAt: null,
              createdAt: new Date(),
            },
          ],
        })
        .mockResolvedValueOnce({
          id: 't-parent',
          subtasks: [{ status: TaskStatus.DONE }],
        })
        .mockResolvedValueOnce(afterDelete);
      taskSubtaskFindFirst.mockResolvedValue({
        id: 'st2',
        taskId: 't-parent',
      });
      taskSubtaskDelete.mockResolvedValue({});
      taskUpdate.mockResolvedValue({});

      const item = await service.removeSubtask(
        't-parent',
        'st2',
        subsidiaryUser,
      );

      expect(taskSubtaskDelete).toHaveBeenCalledWith({ where: { id: 'st2' } });
      expect(item.subtaskProgress).toEqual({
        done: 1,
        total: 1,
        percent: 100,
      });
    });

    it('expose le détail d’une tâche avec sous-tâches', async () => {
      taskFindFirst.mockResolvedValue({
        ...visibleTask,
        subtasks: [
          {
            id: 'st1',
            title: 'A',
            status: TaskStatus.DONE,
            dueDate: null,
            sortOrder: 0,
            completedAt: null,
            createdAt: new Date('2026-07-02'),
          },
        ],
      });

      const item = await service.getTask('t-parent', subsidiaryUser);
      expect(item.id).toBe('t-parent');
      expect(item.subtasks?.[0]?.title).toBe('A');
      expect(item.subtaskProgress).toEqual({
        done: 1,
        total: 1,
        percent: 100,
      });
    });
  });
});
