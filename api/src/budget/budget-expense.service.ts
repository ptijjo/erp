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
} from '../auth/organization-scope';
import { PrismaService } from '../prisma/prisma.service';
import {
  BudgetStatus,
  NotificationType,
} from '../generated/prisma/client';
import { AccountingPeriodService } from '../treasury/accounting-period.service';
import { NotificationService } from '../notification/notification.service';
import type { CreateBudgetExpenseDto } from './dto/budget-expense.dto';

const expenseInclude = {
  budgetLine: {
    select: {
      id: true,
      label: true,
      category: true,
      nature: true,
      amountPlanned: true,
      budgetId: true,
      budget: {
        select: {
          id: true,
          year: true,
          month: true,
          subsidiaryOrganizationId: true,
          subsidiaryOrganization: {
            select: { id: true, name: true, slug: true },
          },
        },
      },
    },
  },
  recordedBy: { select: { id: true, email: true } },
} as const;

@Injectable()
export class BudgetExpenseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountingPeriodService: AccountingPeriodService,
    private readonly notificationService: NotificationService,
  ) {}

  async findExpenseLedger(viewer: AuthenticatedUser) {
    const orgFilter = isMainOrganizationUser(viewer)
      ? {}
      : {
          budgetLine: {
            budget: {
              subsidiaryOrganizationId: viewer.organisationId,
              status: BudgetStatus.APPROVED,
            },
          },
        };

    return this.prisma.budgetExpense.findMany({
      where: orgFilter,
      orderBy: { spentAt: 'desc' },
      include: expenseInclude,
    });
  }

  async findByBudget(budgetId: string, viewer: AuthenticatedUser) {
    const budget = await this.prisma.budget.findUnique({
      where: { id: budgetId },
      select: {
        id: true,
        status: true,
        subsidiaryOrganizationId: true,
      },
    });
    if (!budget) {
      throw new NotFoundException('Budget introuvable');
    }

    assertOrganizationResourceAccess(viewer, budget.subsidiaryOrganizationId);

    if (
      !isMainOrganizationUser(viewer) &&
      budget.status !== BudgetStatus.APPROVED
    ) {
      throw new ForbiddenException(
        'Seuls les budgets validés sont visibles pour votre organisation.',
      );
    }

    return this.prisma.budgetExpense.findMany({
      where: { budgetLine: { budgetId } },
      orderBy: { spentAt: 'desc' },
      include: expenseInclude,
    });
  }

  async recordExpense(
    budgetId: string,
    lineId: string,
    dto: CreateBudgetExpenseDto,
    viewer: AuthenticatedUser,
  ) {
    if (isMainOrganizationUser(viewer)) {
      throw new ForbiddenException(
        'Les sorties sont saisies par les filiales sur leur budget validé.',
      );
    }

    const line = await this.prisma.budgetLine.findUnique({
      where: { id: lineId },
      include: {
        budget: {
          select: {
            id: true,
            status: true,
            subsidiaryOrganizationId: true,
          },
        },
      },
    });

    if (!line) {
      throw new NotFoundException('Ligne budgétaire introuvable');
    }
    if (line.budgetId !== budgetId) {
      throw new BadRequestException(
        'Cette ligne n’appartient pas au budget indiqué.',
      );
    }
    if (line.budget.status !== BudgetStatus.APPROVED) {
      throw new BadRequestException(
        'Les sorties ne peuvent être saisies que sur un budget validé.',
      );
    }
    if (line.budget.subsidiaryOrganizationId !== viewer.organisationId) {
      throw new ForbiddenException(
        'Vous ne pouvez saisir des sorties que pour votre organisation.',
      );
    }

    await this.assertLineHasRemainingCapacity(lineId, line.amountPlanned, dto.amount);

    const spentAt = dto.spentAt ?? new Date();
    await this.accountingPeriodService.assertPeriodOpenForDate(
      line.budget.subsidiaryOrganizationId,
      spentAt,
    );

    const expense = await this.prisma.budgetExpense.create({
      data: {
        budgetLineId: lineId,
        amount: dto.amount,
        label: dto.label?.trim() || null,
        spentAt,
        recordedByUserId: viewer.sub,
      },
      include: expenseInclude,
    });

    void this.maybeNotifyBudgetUtilization(lineId, line.amountPlanned, viewer);

    return expense;
  }

  private async maybeNotifyBudgetUtilization(
    lineId: string,
    amountPlanned: { toString(): string },
    viewer: AuthenticatedUser,
  ): Promise<void> {
    const agg = await this.prisma.budgetExpense.aggregate({
      where: { budgetLineId: lineId },
      _sum: { amount: true },
    });
    const spent = Number(agg._sum.amount ?? 0);
    const planned = Number(amountPlanned.toString());
    if (planned <= 0 || spent / planned < 0.9) {
      return;
    }

    const line = await this.prisma.budgetLine.findUnique({
      where: { id: lineId },
      select: {
        label: true,
        budget: {
          select: {
            subsidiaryOrganizationId: true,
            subsidiaryOrganization: { select: { name: true } },
          },
        },
      },
    });
    if (!line) return;

    const pct = Math.round((spent / planned) * 100);
    await this.notificationService.notifyUsersWithPermission(
      line.budget.subsidiaryOrganizationId,
      'read:Budget',
      {
        type: NotificationType.BUDGET_UTILIZATION_WARNING,
        title: 'Seuil budgétaire atteint',
        body: `La ligne « ${line.label} » (${line.budget.subsidiaryOrganization.name}) est utilisée à ${pct} %.`,
        metadata: { budgetLineId: lineId, utilizationPercent: pct },
      },
    );
  }

  async remove(id: string, viewer: AuthenticatedUser) {
    if (isMainOrganizationUser(viewer)) {
      throw new ForbiddenException(
        'La suppression des sorties est réservée à la filiale concernée.',
      );
    }

    const row = await this.prisma.budgetExpense.findUnique({
      where: { id },
      select: {
        id: true,
        stockOrderId: true,
        budgetLine: {
          select: {
            budget: {
              select: {
                subsidiaryOrganizationId: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!row) {
      throw new NotFoundException('Sortie introuvable');
    }

    if (row.stockOrderId) {
      throw new BadRequestException(
        'Cette sortie provient d’une commande stock confirmée et ne peut pas être supprimée manuellement.',
      );
    }

    const budget = row.budgetLine.budget;
    if (budget.subsidiaryOrganizationId !== viewer.organisationId) {
      throw new ForbiddenException();
    }
    if (budget.status !== BudgetStatus.APPROVED) {
      throw new BadRequestException(
        'Impossible de modifier les sorties d’un budget non validé.',
      );
    }

    return this.prisma.budgetExpense.delete({ where: { id } });
  }

  private async assertLineHasRemainingCapacity(
    lineId: string,
    amountPlanned: { toString(): string },
    newAmount: number,
  ): Promise<void> {
    const agg = await this.prisma.budgetExpense.aggregate({
      where: { budgetLineId: lineId },
      _sum: { amount: true },
    });
    const spent = Number(agg._sum.amount ?? 0);
    const planned = Number(amountPlanned.toString());
    const total = spent + newAmount;

    if (total > planned) {
      const remaining = Math.max(0, planned - spent);
      throw new BadRequestException(
        `Montant dépassant le prévu sur cette ligne (${Math.round(remaining)} FCFA restant(s)). Vous pouvez demander une rallonge à la maison mère.`,
      );
    }
  }
}
