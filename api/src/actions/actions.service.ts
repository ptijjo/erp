import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import {
  assertOrganizationResourceAccess,
  isMainOrganizationUser,
  organizationListWhere,
} from '../auth/organization-scope';
import { bypassesMainOrgPoleScope } from '../auth/pole-scope';
import { AlertsService } from '../alerts/alerts.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  BudgetStatus,
  LeaveStatus,
  OrganizationType,
  TaskPriority,
  TaskScope,
  TaskStatus,
  type Prisma,
} from '../generated/prisma/client';
import type {
  CreateTaskDto,
  CreateTaskSubtaskDto,
  UpdateTaskDto,
  UpdateTaskSubtaskDto,
} from './dto/actions.dto';
import {
  ActionItemDto,
  SYSTEM_ACTION_ID_PREFIX,
  computeSubtaskProgress,
  deriveParentStatusFromSubtasks,
  isSystemActionId,
  type TaskSubtaskDto,
} from './actions.types';
import type { DashboardAlertSeverity } from '../alerts/alerts.service';

const taskInclude = {
  organization: { select: { name: true } },
  assignee: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      profilePhotoUrl: true,
    },
  },
  createdBy: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      profilePhotoUrl: true,
    },
  },
  subtasks: {
    orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }],
  },
} satisfies Prisma.TaskInclude;

type TaskRow = Prisma.TaskGetPayload<{ include: typeof taskInclude }>;

@Injectable()
export class ActionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly alertsService: AlertsService,
  ) {}

  async listActions(
    viewer: AuthenticatedUser,
    statusFilter?: TaskStatus,
  ): Promise<ActionItemDto[]> {
    const manual = await this.listManualTasks(viewer, statusFilter);
    const system =
      statusFilter === TaskStatus.DONE
        ? []
        : await this.buildSystemActions(viewer);

    const merged = [...manual, ...system];
    return merged.sort((a, b) => compareActionItems(a, b));
  }

  async getTask(id: string, viewer: AuthenticatedUser): Promise<ActionItemDto> {
    if (isSystemActionId(id)) {
      throw new ForbiddenException(
        'Les actions système n’ont pas de fiche détail.',
      );
    }
    const row = await this.findVisibleTask(id, viewer);
    return this.toManualActionItem(row);
  }

  async createTask(dto: CreateTaskDto, viewer: AuthenticatedUser) {
    await this.assertOrganizationAccessible(viewer, dto.organizationId);
    this.validateScopePayload(dto.scope ?? TaskScope.USER, dto, viewer);

    const status = dto.status ?? TaskStatus.TODO;
    const startDate = dto.startDate ? new Date(dto.startDate) : null;
    const dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    assertStartBeforeDue(startDate, dueDate);

    return this.prisma.task.create({
      data: {
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        status,
        priority: dto.priority ?? TaskPriority.NORMAL,
        scope: dto.scope ?? TaskScope.USER,
        startDate,
        dueDate,
        completedAt: status === TaskStatus.DONE ? new Date() : null,
        organizationId: dto.organizationId,
        assigneeUserId: dto.assigneeUserId ?? null,
        createdByUserId: viewer.sub,
        poleCode: dto.poleCode ?? null,
      },
      include: taskInclude,
    });
  }

  async updateTask(
    id: string,
    dto: UpdateTaskDto,
    viewer: AuthenticatedUser,
  ) {
    if (isSystemActionId(id)) {
      throw new ForbiddenException(
        'Les actions système ne peuvent pas être modifiées ici.',
      );
    }

    const existing = await this.findVisibleTask(id, viewer);
    this.assertCanMutateTask(existing, viewer);

    let completedAt = existing.completedAt;
    if (dto.status != null) {
      if (dto.status === TaskStatus.DONE) {
        completedAt = new Date();
      } else {
        completedAt = null;
      }
    }

    const nextStart =
      dto.startDate === undefined
        ? existing.startDate
        : dto.startDate
          ? new Date(dto.startDate)
          : null;
    const nextDue =
      dto.dueDate === undefined
        ? existing.dueDate
        : dto.dueDate
          ? new Date(dto.dueDate)
          : null;
    assertStartBeforeDue(nextStart, nextDue);

    await this.prisma.task.update({
      where: { id },
      data: {
        title: dto.title?.trim(),
        description:
          dto.description === undefined
            ? undefined
            : dto.description?.trim() || null,
        status: dto.status,
        priority: dto.priority,
        scope: dto.scope,
        startDate:
          dto.startDate === undefined
            ? undefined
            : dto.startDate
              ? new Date(dto.startDate)
              : null,
        dueDate:
          dto.dueDate === undefined
            ? undefined
            : dto.dueDate
              ? new Date(dto.dueDate)
              : null,
        assigneeUserId:
          dto.assigneeUserId === undefined ? undefined : dto.assigneeUserId,
        poleCode: dto.poleCode === undefined ? undefined : dto.poleCode,
        completedAt,
      },
    });

    return this.getTask(id, viewer);
  }

  async removeTask(id: string, viewer: AuthenticatedUser) {
    if (isSystemActionId(id)) {
      throw new ForbiddenException(
        'Les actions système ne peuvent pas être supprimées ici.',
      );
    }

    const existing = await this.findVisibleTask(id, viewer);
    this.assertCanMutateTask(existing, viewer);

    await this.prisma.task.delete({ where: { id } });
    return { ok: true };
  }

  async createSubtask(
    taskId: string,
    dto: CreateTaskSubtaskDto,
    viewer: AuthenticatedUser,
  ): Promise<ActionItemDto> {
    if (isSystemActionId(taskId)) {
      throw new ForbiddenException(
        'Les actions système ne peuvent pas avoir de sous-tâches.',
      );
    }

    const parent = await this.findVisibleTask(taskId, viewer);
    this.assertCanMutateTask(parent, viewer);

    const agg = await this.prisma.taskSubtask.aggregate({
      where: { taskId },
      _max: { sortOrder: true },
    });
    const sortOrder = (agg._max.sortOrder ?? -1) + 1;
    const status = dto.status ?? TaskStatus.TODO;
    const startDate = dto.startDate ? new Date(dto.startDate) : null;
    const dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    assertStartBeforeDue(startDate, dueDate);

    await this.prisma.taskSubtask.create({
      data: {
        title: dto.title.trim(),
        status,
        priority: dto.priority ?? TaskPriority.NORMAL,
        startDate,
        dueDate,
        sortOrder,
        completedAt: status === TaskStatus.DONE ? new Date() : null,
        taskId,
        organizationId: parent.organizationId,
      },
    });

    await this.syncParentFromSubtasks(taskId);
    return this.getTask(taskId, viewer);
  }

  async updateSubtask(
    taskId: string,
    subtaskId: string,
    dto: UpdateTaskSubtaskDto,
    viewer: AuthenticatedUser,
  ): Promise<ActionItemDto> {
    if (isSystemActionId(taskId)) {
      throw new ForbiddenException(
        'Les actions système ne peuvent pas avoir de sous-tâches.',
      );
    }

    const parent = await this.findVisibleTask(taskId, viewer);
    this.assertCanMutateTask(parent, viewer);

    const existing = await this.prisma.taskSubtask.findFirst({
      where: { id: subtaskId, taskId },
    });
    if (!existing) {
      throw new NotFoundException('Sous-tâche introuvable.');
    }

    let completedAt = existing.completedAt;
    if (dto.status != null) {
      completedAt = dto.status === TaskStatus.DONE ? new Date() : null;
    }

    const nextStart =
      dto.startDate === undefined
        ? existing.startDate
        : dto.startDate
          ? new Date(dto.startDate)
          : null;
    const nextDue =
      dto.dueDate === undefined
        ? existing.dueDate
        : dto.dueDate
          ? new Date(dto.dueDate)
          : null;
    assertStartBeforeDue(nextStart, nextDue);

    await this.prisma.taskSubtask.update({
      where: { id: subtaskId },
      data: {
        title: dto.title?.trim(),
        startDate:
          dto.startDate === undefined
            ? undefined
            : dto.startDate
              ? new Date(dto.startDate)
              : null,
        dueDate:
          dto.dueDate === undefined
            ? undefined
            : dto.dueDate
              ? new Date(dto.dueDate)
              : null,
        status: dto.status,
        priority: dto.priority,
        completedAt,
      },
    });

    await this.syncParentFromSubtasks(taskId);
    return this.getTask(taskId, viewer);
  }

  async removeSubtask(
    taskId: string,
    subtaskId: string,
    viewer: AuthenticatedUser,
  ): Promise<ActionItemDto> {
    if (isSystemActionId(taskId)) {
      throw new ForbiddenException(
        'Les actions système ne peuvent pas avoir de sous-tâches.',
      );
    }

    const parent = await this.findVisibleTask(taskId, viewer);
    this.assertCanMutateTask(parent, viewer);

    const existing = await this.prisma.taskSubtask.findFirst({
      where: { id: subtaskId, taskId },
    });
    if (!existing) {
      throw new NotFoundException('Sous-tâche introuvable.');
    }

    await this.prisma.taskSubtask.delete({ where: { id: subtaskId } });
    await this.syncParentFromSubtasks(taskId);
    return this.getTask(taskId, viewer);
  }

  private async syncParentFromSubtasks(taskId: string): Promise<void> {
    const parent = await this.prisma.task.findFirst({
      where: { id: taskId },
      include: { subtasks: { select: { status: true } } },
    });
    if (!parent) {
      return;
    }

    const derived = deriveParentStatusFromSubtasks(parent.subtasks);
    if (derived == null) {
      return;
    }

    await this.prisma.task.update({
      where: { id: taskId },
      data: {
        status: derived,
        completedAt: derived === TaskStatus.DONE ? new Date() : null,
      },
    });
  }

  private async listManualTasks(
    viewer: AuthenticatedUser,
    statusFilter?: TaskStatus,
  ): Promise<ActionItemDto[]> {
    const rows = await this.prisma.task.findMany({
      where: {
        ...this.taskVisibilityWhere(viewer),
        ...(statusFilter ? { status: statusFilter } : {}),
      },
      include: taskInclude,
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
      take: 200,
    });

    return rows.map((row) => this.toManualActionItem(row));
  }

  private async buildSystemActions(
    viewer: AuthenticatedUser,
  ): Promise<ActionItemDto[]> {
    const items: ActionItemDto[] = [];
    const nowIso = new Date().toISOString();

    const alerts = await this.alertsService.getDashboardAlerts(viewer);
    for (const alert of alerts) {
      items.push({
        id: `${SYSTEM_ACTION_ID_PREFIX}${alert.code}`,
        kind: 'SYSTEM',
        title: alert.title,
        description: alert.message,
        status: TaskStatus.TODO,
        priority: severityToPriority(alert.severity),
        startDate: null,
        dueDate: null,
        href: alert.href,
        createdAt: nowIso,
        completedAt: null,
        editable: false,
      });
    }

    const orgFilter = organizationListWhere(viewer);
    const subsidiaryId =
      'organizationId' in orgFilter ? orgFilter.organizationId : undefined;

    const pendingLeaves = await this.prisma.leaveRequest.findMany({
      where: {
        ...(subsidiaryId ? { organizationId: subsidiaryId } : {}),
        status: LeaveStatus.PENDING,
      },
      include: {
        organization: { select: { name: true } },
        employee: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });

    for (const leave of pendingLeaves) {
      const employeeName =
        [leave.employee.firstName, leave.employee.lastName]
          .filter(Boolean)
          .join(' ')
          .trim() ||
        leave.employee.email ||
        'Employé';
      items.push({
        id: `${SYSTEM_ACTION_ID_PREFIX}LEAVE_PENDING:${leave.id}`,
        kind: 'SYSTEM',
        title: `Valider congé — ${employeeName}`,
        description: `Demande en attente depuis le ${leave.startDate.toLocaleDateString('fr-FR')}.`,
        status: TaskStatus.TODO,
        priority: TaskPriority.NORMAL,
        startDate: null,
        dueDate: leave.startDate.toISOString(),
        href: '/dashboard/rh/conges',
        organizationId: leave.organizationId,
        organizationName: leave.organization.name,
        createdAt: leave.createdAt.toISOString(),
        completedAt: null,
        editable: false,
      });
    }

    const pendingBudgets = await this.prisma.budget.findMany({
      where: {
        ...(subsidiaryId ? { subsidiaryOrganizationId: subsidiaryId } : {}),
        status: BudgetStatus.PENDING_APPROVAL,
      },
      include: {
        subsidiaryOrganization: { select: { name: true } },
      },
      orderBy: { submittedAt: 'asc' },
      take: 20,
    });

    for (const budget of pendingBudgets) {
      items.push({
        id: `${SYSTEM_ACTION_ID_PREFIX}BUDGET_PENDING:${budget.id}`,
        kind: 'SYSTEM',
        title: `Approuver budget — ${budget.subsidiaryOrganization.name}`,
        description: `Budget ${budget.month}/${budget.year} en attente de validation.`,
        status: TaskStatus.TODO,
        priority: TaskPriority.HIGH,
        startDate: null,
        dueDate: budget.submittedAt?.toISOString() ?? null,
        href: '/dashboard/budgets',
        organizationId: budget.subsidiaryOrganizationId,
        organizationName: budget.subsidiaryOrganization.name,
        createdAt: (budget.submittedAt ?? budget.createdAt).toISOString(),
        completedAt: null,
        editable: false,
      });
    }

    return items;
  }

  private taskVisibilityWhere(
    viewer: AuthenticatedUser,
  ): Prisma.TaskWhereInput {
    const orgFilter = organizationListWhere(viewer);
    const orgClause: Prisma.TaskWhereInput = orgFilter;

    const scopeClauses: Prisma.TaskWhereInput[] = [
      {
        scope: TaskScope.USER,
        OR: [
          { assigneeUserId: viewer.sub },
          { createdByUserId: viewer.sub },
        ],
      },
      { scope: TaskScope.ORGANIZATION },
    ];

    if (isMainOrganizationUser(viewer)) {
      if (bypassesMainOrgPoleScope(viewer)) {
        scopeClauses.push({ scope: TaskScope.POLE });
      } else if (viewer.role.poleCode) {
        scopeClauses.push({
          scope: TaskScope.POLE,
          poleCode: viewer.role.poleCode,
        });
      }
    }

    return {
      AND: [orgClause, { OR: scopeClauses }],
    };
  }

  private async findVisibleTask(
    id: string,
    viewer: AuthenticatedUser,
  ): Promise<TaskRow> {
    const row = await this.prisma.task.findFirst({
      where: { id, ...this.taskVisibilityWhere(viewer) },
      include: taskInclude,
    });
    if (!row) {
      throw new NotFoundException('Tâche introuvable.');
    }
    return row;
  }

  private assertCanMutateTask(row: TaskRow, viewer: AuthenticatedUser): void {
    if (row.scope === TaskScope.USER) {
      const allowed =
        row.assigneeUserId === viewer.sub ||
        row.createdByUserId === viewer.sub;
      if (!allowed) {
        throw new ForbiddenException(
          'Modification réservée au créateur ou au responsable.',
        );
      }
      return;
    }

    assertOrganizationResourceAccess(viewer, row.organizationId);

    if (row.scope === TaskScope.POLE && isMainOrganizationUser(viewer)) {
      if (bypassesMainOrgPoleScope(viewer)) {
        return;
      }
      if (row.poleCode && row.poleCode !== viewer.role.poleCode) {
        throw new ForbiddenException('Modification limitée à votre pôle.');
      }
    }
  }

  private async assertOrganizationAccessible(
    viewer: AuthenticatedUser,
    organizationId: string,
  ): Promise<void> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, organizationType: true },
    });
    if (!org) {
      throw new NotFoundException('Organisation introuvable.');
    }
    assertOrganizationResourceAccess(viewer, org.id);
    if (
      !isMainOrganizationUser(viewer) &&
      org.organizationType === OrganizationType.MAIN
    ) {
      throw new ForbiddenException(
        'Les filiales ne peuvent pas créer de tâches sur la maison mère.',
      );
    }
  }

  private validateScopePayload(
    scope: TaskScope,
    dto: CreateTaskDto,
    viewer: AuthenticatedUser,
  ): void {
    switch (scope) {
      case TaskScope.USER:
        return;
      case TaskScope.ORGANIZATION:
        return;
      case TaskScope.POLE:
        if (!isMainOrganizationUser(viewer)) {
          throw new ForbiddenException(
            'Le périmètre pôle est réservé à la maison mère.',
          );
        }
        if (!dto.poleCode?.trim()) {
          throw new ForbiddenException(
            'Le code pôle est requis pour une tâche pôle.',
          );
        }
        return;
      default: {
        const _exhaustive: never = scope;
        return _exhaustive;
      }
    }
  }

  private toUserSummary(
    user: TaskRow['createdBy'],
  ): ActionItemDto['createdBy'] {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      profilePhotoUrl: user.profilePhotoUrl,
    };
  }

  private toSubtaskDto(
    row: TaskRow['subtasks'][number],
  ): TaskSubtaskDto {
    return {
      id: row.id,
      title: row.title,
      status: row.status,
      priority: row.priority,
      startDate: row.startDate?.toISOString() ?? null,
      dueDate: row.dueDate?.toISOString() ?? null,
      sortOrder: row.sortOrder,
      completedAt: row.completedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private toManualActionItem(row: TaskRow): ActionItemDto {
    const createdBy = this.toUserSummary(row.createdBy);
    const assignee = row.assignee
      ? this.toUserSummary(row.assignee)
      : null;
    const subtasks = (row.subtasks ?? []).map((s) => this.toSubtaskDto(s));
    const subtaskProgress = computeSubtaskProgress(subtasks);

    return {
      id: row.id,
      kind: 'MANUAL',
      title: row.title,
      description: row.description ?? undefined,
      status: row.status,
      priority: row.priority,
      scope: row.scope,
      startDate: row.startDate?.toISOString() ?? null,
      dueDate: row.dueDate?.toISOString() ?? null,
      organizationId: row.organizationId,
      organizationName: row.organization.name,
      assigneeUserId: row.assigneeUserId,
      assignee,
      createdByUserId: row.createdByUserId,
      createdBy,
      createdAt: row.createdAt.toISOString(),
      completedAt: row.completedAt?.toISOString() ?? null,
      editable: true,
      subtasks,
      subtaskProgress,
    };
  }
}

function severityToPriority(
  severity: DashboardAlertSeverity,
): TaskPriority {
  switch (severity) {
    case 'critical':
      return TaskPriority.HIGH;
    case 'warning':
      return TaskPriority.NORMAL;
    case 'info':
      return TaskPriority.LOW;
    default: {
      const _exhaustive: never = severity;
      return _exhaustive;
    }
  }
}

function assertStartBeforeDue(
  startDate: Date | null,
  dueDate: Date | null,
): void {
  if (startDate && dueDate && startDate.getTime() > dueDate.getTime()) {
    throw new BadRequestException(
      'La date de début doit être antérieure ou égale à la date butoir.',
    );
  }
}

const STATUS_ORDER: Record<TaskStatus, number> = {
  [TaskStatus.TODO]: 0,
  [TaskStatus.IN_PROGRESS]: 1,
  [TaskStatus.DONE]: 2,
};

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  [TaskPriority.HIGH]: 0,
  [TaskPriority.NORMAL]: 1,
  [TaskPriority.LOW]: 2,
};

function compareActionItems(a: ActionItemDto, b: ActionItemDto): number {
  const statusDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
  if (statusDiff !== 0) return statusDiff;

  if (a.dueDate && b.dueDate) {
    const dueDiff = a.dueDate.localeCompare(b.dueDate);
    if (dueDiff !== 0) return dueDiff;
  } else if (a.dueDate) {
    return -1;
  } else if (b.dueDate) {
    return 1;
  }

  const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
  if (priorityDiff !== 0) return priorityDiff;

  return b.createdAt.localeCompare(a.createdAt);
}
