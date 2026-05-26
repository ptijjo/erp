import { Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { isMainOrganizationUser } from '../auth/organization-scope';
import { PrismaService } from '../prisma/prisma.service';
import {
  BudgetStatus,
  BudgetSupplementStatus,
  type BudgetLineCategory,
} from '../generated/prisma/client';
import type { BudgetOverviewQueryDto } from './dto/budget-query.dto';

export type BudgetOverviewDto = {
  year: number;
  workflow: {
    budgetsPendingApproval: number;
    supplementsPendingFinance: number;
    supplementsPendingDirectors: number;
  };
  totals: {
    plannedFcfa: number;
    spentFcfa: number;
    utilizationPercent: number;
  };
  bySubsidiary: Array<{
    organizationId: string;
    name: string;
    slug: string;
    plannedFcfa: number;
    spentFcfa: number;
    approvedBudgets: number;
  }>;
  byCategory: Array<{
    category: BudgetLineCategory;
    plannedFcfa: number;
    spentFcfa: number;
  }>;
  stockOrders: {
    pending: number;
    confirmedMonthTotalFcfa: number;
  };
};

@Injectable()
export class BudgetOverviewService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(
    viewer: AuthenticatedUser,
    query: BudgetOverviewQueryDto,
  ): Promise<BudgetOverviewDto> {
    const year = query.year ?? new Date().getFullYear();
    const orgFilter = isMainOrganizationUser(viewer)
      ? query.subsidiaryOrganizationId
        ? { subsidiaryOrganizationId: query.subsidiaryOrganizationId }
        : {}
      : { subsidiaryOrganizationId: viewer.organisationId };

    const [
      budgetsPendingApproval,
      supplementsPendingFinance,
      supplementsPendingDirectors,
      approvedBudgets,
      stockPending,
    ] = await Promise.all([
      this.prisma.budget.count({
        where: {
          ...orgFilter,
          status: BudgetStatus.PENDING_APPROVAL,
        },
      }),
      this.prisma.budgetSupplementRequest.count({
        where: {
          status: BudgetSupplementStatus.PENDING_FINANCE,
          budget: orgFilter,
        },
      }),
      this.prisma.budgetSupplementRequest.count({
        where: {
          status: BudgetSupplementStatus.PENDING_APPROVAL,
          budget: orgFilter,
        },
      }),
      this.prisma.budget.findMany({
        where: {
          ...orgFilter,
          year,
          status: BudgetStatus.APPROVED,
        },
        include: {
          subsidiaryOrganization: {
            select: { id: true, name: true, slug: true },
          },
          lines: {
            include: {
              expenses: { select: { amount: true } },
            },
          },
        },
      }),
      this.prisma.stockOrder.count({
        where: {
          ...(isMainOrganizationUser(viewer)
            ? query.subsidiaryOrganizationId
              ? { subsidiaryOrganizationId: query.subsidiaryOrganizationId }
              : {}
            : { subsidiaryOrganizationId: viewer.organisationId }),
          status: 'PENDING',
        },
      }),
    ]);

    let totalPlanned = 0;
    let totalSpent = 0;
    const subsidiaryMap = new Map<
      string,
      {
        organizationId: string;
        name: string;
        slug: string;
        plannedFcfa: number;
        spentFcfa: number;
        approvedBudgets: number;
      }
    >();
    const categoryMap = new Map<
      BudgetLineCategory,
      { plannedFcfa: number; spentFcfa: number }
    >();

    for (const budget of approvedBudgets) {
      const org = budget.subsidiaryOrganization;
      let sub = subsidiaryMap.get(org.id);
      if (!sub) {
        sub = {
          organizationId: org.id,
          name: org.name,
          slug: org.slug,
          plannedFcfa: 0,
          spentFcfa: 0,
          approvedBudgets: 0,
        };
        subsidiaryMap.set(org.id, sub);
      }
      sub.approvedBudgets += 1;

      for (const line of budget.lines) {
        const planned = Number(line.amountPlanned);
        const spent = line.expenses.reduce(
          (s, e) => s + Number(e.amount),
          0,
        );
        totalPlanned += planned;
        totalSpent += spent;
        sub.plannedFcfa += planned;
        sub.spentFcfa += spent;

        const cat = categoryMap.get(line.category) ?? {
          plannedFcfa: 0,
          spentFcfa: 0,
        };
        cat.plannedFcfa += planned;
        cat.spentFcfa += spent;
        categoryMap.set(line.category, cat);
      }
    }

    const confirmedOrders = await this.prisma.stockOrder.findMany({
      where: {
        ...(isMainOrganizationUser(viewer)
          ? query.subsidiaryOrganizationId
            ? { subsidiaryOrganizationId: query.subsidiaryOrganizationId }
            : {}
          : { subsidiaryOrganizationId: viewer.organisationId }),
        status: 'CONFIRMED',
        createdAt: {
          gte: new Date(year, 0, 1),
          lt: new Date(year + 1, 0, 1),
        },
      },
      select: { quantity: true, unitPrice: true },
    });
    const confirmedMonthTotalFcfa = confirmedOrders.reduce(
      (s, o) => s + Number(o.unitPrice) * o.quantity,
      0,
    );

    return {
      year,
      workflow: {
        budgetsPendingApproval,
        supplementsPendingFinance,
        supplementsPendingDirectors,
      },
      totals: {
        plannedFcfa: totalPlanned,
        spentFcfa: totalSpent,
        utilizationPercent:
          totalPlanned > 0
            ? Math.round((totalSpent / totalPlanned) * 1000) / 10
            : 0,
      },
      bySubsidiary: [...subsidiaryMap.values()].sort((a, b) =>
        a.name.localeCompare(b.name, 'fr'),
      ),
      byCategory: [...categoryMap.entries()]
        .map(([category, v]) => ({ category, ...v }))
        .sort((a, b) => a.category.localeCompare(b.category)),
      stockOrders: {
        pending: stockPending,
        confirmedMonthTotalFcfa,
      },
    };
  }
}
