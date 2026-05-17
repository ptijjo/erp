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
import { BudgetStatus } from '../generated/prisma/client';
import type { CreateBudgetExpenseDto } from './dto/budget-expense.dto';

const expenseInclude = {
  budgetLine: {
    select: {
      id: true,
      label: true,
      category: true,
      budgetId: true,
    },
  },
  recordedBy: { select: { id: true, email: true } },
} as const;

@Injectable()
export class BudgetExpenseService {
  constructor(private readonly prisma: PrismaService) {}

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

    return this.prisma.budgetExpense.create({
      data: {
        budgetLineId: lineId,
        amount: dto.amount,
        label: dto.label?.trim() || null,
        spentAt: dto.spentAt ?? new Date(),
        recordedByUserId: viewer.sub,
      },
      include: expenseInclude,
    });
  }

  async remove(id: string, viewer: AuthenticatedUser) {
    if (isMainOrganizationUser(viewer)) {
      throw new ForbiddenException(
        'La suppression des sorties est réservée à la filiale concernée.',
      );
    }

    const row = await this.prisma.budgetExpense.findUnique({
      where: { id },
      include: {
        budgetLine: {
          include: {
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
}
