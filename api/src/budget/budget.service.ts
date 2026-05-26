import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import {
  assertOrganizationResourceAccess,
  isMainOrganizationUser,
} from '../auth/organization-scope';
import { PrismaService } from '../prisma/prisma.service';
import {
  BudgetStatus,
  BudgetLineCategory,
  BudgetLineNature,
  NotificationType,
  OrganizationType,
} from '../generated/prisma/client';
import { NotificationService } from '../notification/notification.service';
import type { Prisma } from '../generated/prisma/client';
import type {
  CreateBudgetDto,
  RejectBudgetDto,
  SubmitBudgetDto,
  UpdateBudgetDto,
} from './dto/budget.dto';
import type { CreateBudgetLineDto } from './dto/budget.dto';
import {
  assertCanApproveBudget,
  assertCanProposeBudget,
} from './budget-workflow.util';
import { defaultNatureForCategory } from './budget-line.defaults';
import type { ListBudgetQueryDto } from './dto/budget-query.dto';
import {
  buildPaginationMeta,
  paginationSkip,
  resolvePagination,
  type PaginatedResult,
} from '../lib/pagination';

const budgetInclude = {
  subsidiaryOrganization: {
    select: { id: true, name: true, slug: true, organizationType: true },
  },
  lines: { orderBy: { createdAt: 'asc' as const } },
  submittedBy: {
    select: { id: true, email: true, firstName: true, lastName: true },
  },
  approvedBy: {
    select: { id: true, email: true, firstName: true, lastName: true },
  },
  rejectedBy: {
    select: { id: true, email: true, firstName: true, lastName: true },
  },
} as const;

function mapLineCreate(line: CreateBudgetLineDto) {
  const category = line.category as BudgetLineCategory;
  const nature =
    (line.nature as BudgetLineNature | undefined) ??
    defaultNatureForCategory(line.category);
  return {
    category,
    nature,
    label: line.label.trim(),
    amountPlanned: line.amountPlanned,
  };
}

@Injectable()
export class BudgetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  async findAll(
    viewer: AuthenticatedUser,
    query: ListBudgetQueryDto = {},
  ): Promise<
    PaginatedResult<
      Prisma.BudgetGetPayload<{ include: typeof budgetInclude }>
    >
  > {
    const { page, limit } = resolvePagination(query);

    const where: Prisma.BudgetWhereInput = isMainOrganizationUser(viewer)
      ? {}
      : {
          subsidiaryOrganizationId: viewer.organisationId,
          status: BudgetStatus.APPROVED,
        };

    if (query.subsidiaryOrganizationId) {
      where.subsidiaryOrganizationId = query.subsidiaryOrganizationId;
    }
    if (query.year != null) {
      where.year = query.year;
    }
    if (query.month != null) {
      where.month = query.month;
    }
    if (query.status) {
      where.status = query.status as BudgetStatus;
    } else if (!isMainOrganizationUser(viewer)) {
      where.status = BudgetStatus.APPROVED;
    }

    const [items, total] = await Promise.all([
      this.prisma.budget.findMany({
        where,
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        include: budgetInclude,
        skip: paginationSkip(page, limit),
        take: limit,
      }),
      this.prisma.budget.count({ where }),
    ]);

    return { items, meta: buildPaginationMeta(total, page, limit) };
  }

  async findOne(id: string, viewer: AuthenticatedUser) {
    const row = await this.prisma.budget.findUnique({
      where: { id },
      include: budgetInclude,
    });
    if (!row) {
      throw new NotFoundException('Budget introuvable');
    }

    assertOrganizationResourceAccess(
      viewer,
      row.subsidiaryOrganizationId,
    );

    if (
      !isMainOrganizationUser(viewer) &&
      row.status !== BudgetStatus.APPROVED
    ) {
      throw new ForbiddenException(
        'Seuls les budgets validés sont visibles pour votre organisation.',
      );
    }

    const linesWithUsage = await Promise.all(
      row.lines.map(async (line) => {
        const agg = await this.prisma.budgetExpense.aggregate({
          where: { budgetLineId: line.id },
          _sum: { amount: true },
        });
        const spentFcfa = Number(agg._sum.amount ?? 0);
        const plannedFcfa = Number(line.amountPlanned);
        return {
          ...line,
          spentFcfa,
          remainingFcfa: Math.max(0, plannedFcfa - spentFcfa),
        };
      }),
    );

    return { ...row, lines: linesWithUsage };
  }

  async create(dto: CreateBudgetDto, viewer: AuthenticatedUser) {
    assertCanProposeBudget(viewer);

    const org = await this.prisma.organization.findUnique({
      where: { id: dto.subsidiaryOrganizationId },
      select: { organizationType: true },
    });
    if (!org || org.organizationType !== OrganizationType.SUBSIDIARY) {
      throw new BadRequestException(
        'Le budget doit être associé à une organisation filiale.',
      );
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        return tx.budget.create({
          data: {
            subsidiaryOrganizationId: dto.subsidiaryOrganizationId,
            year: dto.year,
            month: dto.month,
            status: BudgetStatus.DRAFT,
            lines: {
              create: dto.lines.map(mapLineCreate),
            },
          },
          include: budgetInclude,
        });
      });
    } catch (e: unknown) {
      if (
        e &&
        typeof e === 'object' &&
        'code' in e &&
        e.code === 'P2002'
      ) {
        throw new ConflictException(
          'Un budget existe déjà pour cette filiale et cette période (mois/année).',
        );
      }
      throw e;
    }
  }

  async update(id: string, dto: UpdateBudgetDto, viewer: AuthenticatedUser) {
    assertCanProposeBudget(viewer);

    const row = await this.prisma.budget.findUnique({
      where: { id },
      include: { lines: true },
    });
    if (!row) {
      throw new NotFoundException('Budget introuvable');
    }
    if (
      row.status !== BudgetStatus.DRAFT &&
      row.status !== BudgetStatus.REJECTED
    ) {
      throw new BadRequestException(
        'Seul un brouillon ou un budget refusé peut être modifié.',
      );
    }

    return this.prisma.budget.update({
      where: { id },
      data: {
        status: BudgetStatus.DRAFT,
        rejectedAt: null,
        rejectedByUserId: null,
        rejectionReason: null,
        submittedAt: null,
        submittedByUserId: null,
        financeNote: null,
        lines: {
          deleteMany: {},
          create: dto.lines.map(mapLineCreate),
        },
      },
      include: budgetInclude,
    });
  }

  async submitForApproval(
    id: string,
    dto: SubmitBudgetDto,
    viewer: AuthenticatedUser,
  ) {
    assertCanProposeBudget(viewer);

    const row = await this.prisma.budget.findUnique({
      where: { id },
      include: { lines: true },
    });
    if (!row) {
      throw new NotFoundException('Budget introuvable');
    }
    if (
      row.status !== BudgetStatus.DRAFT &&
      row.status !== BudgetStatus.REJECTED
    ) {
      throw new BadRequestException(
        'Seuls les brouillons ou budgets refusés peuvent être soumis à validation.',
      );
    }
    if (row.lines.length === 0) {
      throw new BadRequestException(
        'Le budget doit contenir au moins une ligne avant soumission.',
      );
    }

    const updated = await this.prisma.budget.update({
      where: { id },
      data: {
        status: BudgetStatus.PENDING_APPROVAL,
        financeNote: dto.financeNote?.trim() || null,
        submittedAt: new Date(),
        submittedByUserId: viewer.sub,
        rejectedAt: null,
        rejectedByUserId: null,
        rejectionReason: null,
      },
      include: budgetInclude,
    });

    void this.notificationService.notifyMainUsersWithPermission(
      'update:Budget',
      {
        type: NotificationType.BUDGET_PENDING_APPROVAL,
        title: 'Budget à valider',
        body: `Le budget ${updated.month}/${updated.year} de ${updated.subsidiaryOrganization.name} attend une validation.`,
        metadata: { budgetId: updated.id },
      },
    );

    return updated;
  }

  async approve(id: string, viewer: AuthenticatedUser) {
    assertCanApproveBudget(viewer);

    const row = await this.prisma.budget.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException('Budget introuvable');
    }
    if (row.status !== BudgetStatus.PENDING_APPROVAL) {
      throw new BadRequestException(
        'Seuls les budgets en attente de validation peuvent être approuvés.',
      );
    }

    return this.prisma.budget.update({
      where: { id },
      data: {
        status: BudgetStatus.APPROVED,
        approvedAt: new Date(),
        approvedByUserId: viewer.sub,
      },
      include: budgetInclude,
    });
  }

  async reject(id: string, dto: RejectBudgetDto, viewer: AuthenticatedUser) {
    assertCanApproveBudget(viewer);

    const row = await this.prisma.budget.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException('Budget introuvable');
    }
    if (row.status !== BudgetStatus.PENDING_APPROVAL) {
      throw new BadRequestException(
        'Seuls les budgets en attente de validation peuvent être refusés.',
      );
    }

    return this.prisma.budget.update({
      where: { id },
      data: {
        status: BudgetStatus.REJECTED,
        rejectionReason: dto.rejectionReason.trim(),
        rejectedAt: new Date(),
        rejectedByUserId: viewer.sub,
        approvedAt: null,
        approvedByUserId: null,
      },
      include: budgetInclude,
    });
  }

  async remove(id: string, viewer: AuthenticatedUser) {
    assertCanProposeBudget(viewer);

    const row = await this.prisma.budget.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException('Budget introuvable');
    }
    if (
      row.status !== BudgetStatus.DRAFT &&
      row.status !== BudgetStatus.REJECTED
    ) {
      throw new BadRequestException(
        'Seul un brouillon ou un budget refusé peut être supprimé.',
      );
    }

    await this.prisma.budget.delete({ where: { id } });
    return { ok: true as const };
  }
}
