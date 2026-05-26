import { ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import {
  isMainOrganizationUser,
  organizationListWhere,
} from '../auth/organization-scope';
import { CaslAbilityFactory } from '../casl/casl-ability.factory';
import { BudgetOverviewService } from '../budget/budget-overview.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  BudgetStatus,
  EmployeeStatus,
  LeaveStatus,
  OrganizationType,
  StockOrderStatus,
  VenteStatut,
  type Prisma,
} from '../generated/prisma/client';
import type { AnalyticsOverviewQueryDto } from './dto/analytics-query.dto';
import type {
  AnalyticsCatalogOverviewDto,
  AnalyticsFinancialOverviewDto,
  AnalyticsHrOverviewDto,
  AnalyticsProductRotationDto,
  AnalyticsSpendingByMonthDto,
  AnalyticsStockOrdersOverviewDto,
  AnalyticsStockOverviewDto,
  GroupAnalyticsOverviewDto,
} from './analytics.types';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly caslAbilityFactory: CaslAbilityFactory,
    private readonly budgetOverviewService: BudgetOverviewService,
  ) {}

  async getGroupOverview(
    viewer: AuthenticatedUser,
    query: AnalyticsOverviewQueryDto,
  ): Promise<GroupAnalyticsOverviewDto> {
    const ability = await this.caslAbilityFactory.createForUser(viewer);
    const year = query.year ?? new Date().getFullYear();
    const main = isMainOrganizationUser(viewer);

    const subsidiaryFilter = main
      ? query.subsidiaryOrganizationId?.trim() || undefined
      : viewer.organisationId;

    const result: GroupAnalyticsOverviewDto = {
      year,
      scope: main ? 'MAIN' : 'SUBSIDIARY',
    };

    if (ability.can('read', 'Budget')) {
      result.budget = await this.budgetOverviewService.getOverview(viewer, {
        year,
        subsidiaryOrganizationId: subsidiaryFilter,
      });
      result.spendingByMonth = await this.buildSpendingByMonth(
        viewer,
        year,
        subsidiaryFilter,
      );
    }

    const canRevenue = ability.can('read', 'Vente');
    const canExpenses = ability.can('read', 'Budget');
    if (canRevenue || canExpenses) {
      result.financial = await this.buildFinancialOverview(
        viewer,
        year,
        subsidiaryFilter,
        result.budget,
        result.spendingByMonth,
        canRevenue,
        canExpenses,
      );
    }

    if (canRevenue && ability.can('read', 'Stock')) {
      result.productRotation = await this.buildProductRotation(
        viewer,
        year,
        subsidiaryFilter,
      );
    }

    if (ability.can('read', 'Employee')) {
      result.hr = await this.buildHrOverview(viewer, subsidiaryFilter);
    }

    if (ability.can('read', 'Stock')) {
      result.stock = await this.buildStockOverview(viewer, subsidiaryFilter);
    }

    if (ability.can('read', 'StockOrder')) {
      result.stockOrders = await this.buildStockOrdersOverview(
        viewer,
        year,
        subsidiaryFilter,
      );
    }

    if (main && ability.can('read', 'Product')) {
      result.catalog = await this.buildCatalogOverview();
    }

    if (
      !result.budget &&
      !result.financial &&
      !result.productRotation &&
      !result.hr &&
      !result.stock &&
      !result.stockOrders &&
      !result.catalog
    ) {
      throw new ForbiddenException(
        'Aucune section de synthèse n’est accessible avec vos permissions.',
      );
    }

    return result;
  }

  private orgWhereForSubsidiary(
    subsidiaryOrganizationId: string | undefined,
  ): Prisma.OrganizationWhereInput {
    if (subsidiaryOrganizationId) {
      return { id: subsidiaryOrganizationId };
    }
    return { organizationType: OrganizationType.SUBSIDIARY };
  }

  private async buildHrOverview(
    viewer: AuthenticatedUser,
    subsidiaryOrganizationId: string | undefined,
  ): Promise<AnalyticsHrOverviewDto> {
    const orgListFilter = organizationListWhere(viewer);
    const employeeWhere: Prisma.EmployeeWhereInput =
      'organizationId' in orgListFilter && orgListFilter.organizationId
        ? { organizationId: orgListFilter.organizationId }
        : subsidiaryOrganizationId
          ? { organizationId: subsidiaryOrganizationId }
          : {};

    const leaveWhere: Prisma.LeaveRequestWhereInput = {
      status: LeaveStatus.PENDING,
      employee: employeeWhere,
    };

    const [employeesTotal, employeesActive, leaveRequestsPending, activeByOrg] =
      await Promise.all([
        this.prisma.employee.count({ where: employeeWhere }),
        this.prisma.employee.count({
          where: { ...employeeWhere, status: EmployeeStatus.ACTIVE },
        }),
        this.prisma.leaveRequest.count({ where: leaveWhere }),
        this.prisma.employee.groupBy({
          by: ['organizationId'],
          where: { ...employeeWhere, status: EmployeeStatus.ACTIVE },
          _count: { _all: true },
        }),
      ]);

    const orgIds = activeByOrg.map((g) => g.organizationId);
    const leaveByOrg =
      orgIds.length > 0
        ? await this.prisma.leaveRequest.groupBy({
            by: ['employeeId'],
            where: leaveWhere,
            _count: { _all: true },
          })
        : [];

    const employeesForLeave =
      leaveByOrg.length > 0
        ? await this.prisma.employee.findMany({
            where: { id: { in: leaveByOrg.map((l) => l.employeeId) } },
            select: { id: true, organizationId: true },
          })
        : [];

    const leavePendingByOrg = new Map<string, number>();
    for (const row of leaveByOrg) {
      const emp = employeesForLeave.find((e) => e.id === row.employeeId);
      if (!emp) continue;
      leavePendingByOrg.set(
        emp.organizationId,
        (leavePendingByOrg.get(emp.organizationId) ?? 0) + row._count._all,
      );
    }

    const orgs =
      orgIds.length > 0
        ? await this.prisma.organization.findMany({
            where: { id: { in: orgIds } },
            select: { id: true, name: true },
          })
        : [];

    const orgName = new Map(orgs.map((o) => [o.id, o.name] as const));

    const bySubsidiary = activeByOrg
      .map((g) => ({
        organizationId: g.organizationId,
        name: orgName.get(g.organizationId) ?? g.organizationId,
        employeesActive: g._count._all,
        leavePending: leavePendingByOrg.get(g.organizationId) ?? 0,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'));

    return {
      employeesActive,
      employeesTotal,
      leaveRequestsPending,
      bySubsidiary,
    };
  }

  private async buildStockOverview(
    viewer: AuthenticatedUser,
    subsidiaryOrganizationId: string | undefined,
  ): Promise<AnalyticsStockOverviewDto> {
    const stocks = await this.prisma.stock.findMany({
      where: {
        organization: this.orgWhereForSubsidiary(subsidiaryOrganizationId),
        ...(!isMainOrganizationUser(viewer)
          ? { organizationId: viewer.organisationId }
          : {}),
      },
      select: {
        quantity: true,
        minQuantity: true,
        organizationId: true,
        organization: { select: { id: true, name: true } },
      },
    });

    let stockLines = 0;
    let lowStockLines = 0;
    const bySub = new Map<
      string,
      { organizationId: string; name: string; stockLines: number; lowStockLines: number }
    >();

    for (const s of stocks) {
      stockLines += 1;
      const low = s.quantity <= s.minQuantity;
      if (low) lowStockLines += 1;

      let row = bySub.get(s.organizationId);
      if (!row) {
        row = {
          organizationId: s.organizationId,
          name: s.organization.name,
          stockLines: 0,
          lowStockLines: 0,
        };
        bySub.set(s.organizationId, row);
      }
      row.stockLines += 1;
      if (low) row.lowStockLines += 1;
    }

    return {
      stockLines,
      lowStockLines,
      bySubsidiary: [...bySub.values()].sort((a, b) =>
        a.name.localeCompare(b.name, 'fr'),
      ),
    };
  }

  private async buildStockOrdersOverview(
    viewer: AuthenticatedUser,
    year: number,
    subsidiaryOrganizationId: string | undefined,
  ): Promise<AnalyticsStockOrdersOverviewDto> {
    const baseWhere: Prisma.StockOrderWhereInput = isMainOrganizationUser(viewer)
      ? subsidiaryOrganizationId
        ? { subsidiaryOrganizationId }
        : {}
      : { subsidiaryOrganizationId: viewer.organisationId };

    const yearWhere: Prisma.StockOrderWhereInput = {
      ...baseWhere,
      createdAt: {
        gte: new Date(year, 0, 1),
        lt: new Date(year + 1, 0, 1),
      },
    };

    const [pending, confirmed, cancelled, statusGroups, confirmedOrders] =
      await Promise.all([
        this.prisma.stockOrder.count({
          where: { ...baseWhere, status: StockOrderStatus.PENDING },
        }),
        this.prisma.stockOrder.count({
          where: { ...yearWhere, status: StockOrderStatus.CONFIRMED },
        }),
        this.prisma.stockOrder.count({
          where: { ...yearWhere, status: StockOrderStatus.CANCELLED },
        }),
        this.prisma.stockOrder.groupBy({
          by: ['status'],
          where: yearWhere,
          _count: { _all: true },
        }),
        this.prisma.stockOrder.findMany({
          where: { ...yearWhere, status: StockOrderStatus.CONFIRMED },
          select: { quantity: true, unitPrice: true },
        }),
      ]);

    const confirmedYearTotalFcfa = confirmedOrders.reduce(
      (s, o) => s + Number(o.unitPrice) * o.quantity,
      0,
    );

    return {
      pending,
      confirmed,
      cancelled,
      confirmedYearTotalFcfa,
      byStatus: statusGroups.map((g) => ({
        status: g.status,
        count: g._count._all,
      })),
    };
  }

  private async buildCatalogOverview(): Promise<AnalyticsCatalogOverviewDto> {
    const [productsTotal, productsOfferedToSubsidiaries, subsidiariesCount] =
      await Promise.all([
        this.prisma.product.count({ where: { deletedAt: null } }),
        this.prisma.product.count({
          where: { deletedAt: null, offeredToSubsidiaries: true },
        }),
        this.prisma.organization.count({
          where: { organizationType: OrganizationType.SUBSIDIARY },
        }),
      ]);

    return {
      productsTotal,
      productsOfferedToSubsidiaries,
      subsidiariesCount,
    };
  }

  private async buildSpendingByMonth(
    viewer: AuthenticatedUser,
    year: number,
    subsidiaryOrganizationId: string | undefined,
  ): Promise<AnalyticsSpendingByMonthDto[]> {
    const orgFilter = isMainOrganizationUser(viewer)
      ? subsidiaryOrganizationId
        ? { subsidiaryOrganizationId }
        : {}
      : { subsidiaryOrganizationId: viewer.organisationId };

    const expenses = await this.prisma.budgetExpense.findMany({
      where: {
        spentAt: {
          gte: new Date(year, 0, 1),
          lt: new Date(year + 1, 0, 1),
        },
        budgetLine: {
          budget: {
            ...orgFilter,
            status: BudgetStatus.APPROVED,
            year,
          },
        },
      },
      select: { amount: true, spentAt: true },
    });

    const byMonth = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      spentFcfa: 0,
    }));

    for (const e of expenses) {
      const m = e.spentAt.getMonth();
      byMonth[m]!.spentFcfa += Number(e.amount);
    }

    return byMonth;
  }

  private venteOrgFilter(
    viewer: AuthenticatedUser,
    subsidiaryOrganizationId: string | undefined,
  ): Prisma.VenteWhereInput {
    if (!isMainOrganizationUser(viewer)) {
      return { organizationId: viewer.organisationId };
    }
    if (subsidiaryOrganizationId) {
      return { organizationId: subsidiaryOrganizationId };
    }
    return {
      organization: { organizationType: OrganizationType.SUBSIDIARY },
    };
  }

  private async buildFinancialOverview(
    viewer: AuthenticatedUser,
    year: number,
    subsidiaryOrganizationId: string | undefined,
    budgetOverview: GroupAnalyticsOverviewDto['budget'],
    spendingByMonth: AnalyticsSpendingByMonthDto[] | undefined,
    includeRevenue: boolean,
    includeExpenses: boolean,
  ): Promise<AnalyticsFinancialOverviewDto> {
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year + 1, 0, 1);
    const venteWhere: Prisma.VenteWhereInput = {
      status: VenteStatut.CONFIRMED,
      createdAt: { gte: yearStart, lt: yearEnd },
      ...this.venteOrgFilter(viewer, subsidiaryOrganizationId),
    };

    let revenueFcfa = 0;
    const revenueByMonth = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      revenueFcfa: 0,
    }));

    if (includeRevenue) {
      const ventes = await this.prisma.vente.findMany({
        where: venteWhere,
        select: { totalAmount: true, createdAt: true },
      });
      for (const v of ventes) {
        const amt = Number(v.totalAmount);
        revenueFcfa += amt;
        revenueByMonth[v.createdAt.getMonth()]!.revenueFcfa += amt;
      }
    }

    let expensesFcfa = 0;
    if (includeExpenses && spendingByMonth) {
      expensesFcfa = spendingByMonth.reduce((s, m) => s + m.spentFcfa, 0);
    } else if (includeExpenses) {
      const spending = await this.buildSpendingByMonth(
        viewer,
        year,
        subsidiaryOrganizationId,
      );
      expensesFcfa = spending.reduce((s, m) => s + m.spentFcfa, 0);
    }

    const spentByMonth =
      spendingByMonth ??
      (includeExpenses
        ? await this.buildSpendingByMonth(
            viewer,
            year,
            subsidiaryOrganizationId,
          )
        : Array.from({ length: 12 }, (_, i) => ({ month: i + 1, spentFcfa: 0 })));

    const cashflowByMonth = revenueByMonth.map((r, i) => ({
      month: r.month,
      revenueFcfa: r.revenueFcfa,
      spentFcfa: spentByMonth[i]?.spentFcfa ?? 0,
    }));

    const revenueByOrg = includeRevenue
      ? await this.prisma.vente.groupBy({
          by: ['organizationId'],
          where: venteWhere,
          _sum: { totalAmount: true },
        })
      : [];

    const orgIds = new Set<string>();
    for (const g of revenueByOrg) orgIds.add(g.organizationId);
    if (budgetOverview) {
      for (const s of budgetOverview.bySubsidiary) orgIds.add(s.organizationId);
    }

    const orgs =
      orgIds.size > 0
        ? await this.prisma.organization.findMany({
            where: { id: { in: [...orgIds] } },
            select: { id: true, name: true },
          })
        : [];
    const orgName = new Map(orgs.map((o) => [o.id, o.name] as const));

    const budgetByOrg = new Map(
      (budgetOverview?.bySubsidiary ?? []).map((s) => [s.organizationId, s]),
    );
    const revenueMap = new Map(
      revenueByOrg.map((g) => [g.organizationId, Number(g._sum.totalAmount ?? 0)]),
    );

    const bySubsidiary = [...orgIds]
      .map((organizationId) => {
        const budgetRow = budgetByOrg.get(organizationId);
        const rev = revenueMap.get(organizationId) ?? 0;
        const exp = budgetRow?.spentFcfa ?? 0;
        const planned = budgetRow?.plannedFcfa ?? 0;
        const utilizationPercent =
          planned > 0 ? Math.round((exp / planned) * 1000) / 10 : 0;
        return {
          organizationId,
          name: orgName.get(organizationId) ?? organizationId,
          revenueFcfa: rev,
          expensesFcfa: exp,
          plannedFcfa: planned,
          utilizationPercent,
          overBudget: planned > 0 && exp > planned,
          atRisk: planned > 0 && exp / planned >= 0.9 && exp <= planned,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'));

    return {
      revenueFcfa,
      expensesFcfa,
      netFcfa: revenueFcfa - expensesFcfa,
      revenueByMonth,
      cashflowByMonth,
      bySubsidiary,
    };
  }

  private async buildProductRotation(
    viewer: AuthenticatedUser,
    year: number,
    subsidiaryOrganizationId: string | undefined,
  ): Promise<AnalyticsProductRotationDto> {
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year + 1, 0, 1);

    const lines = await this.prisma.venteLine.findMany({
      where: {
        vente: {
          status: VenteStatut.CONFIRMED,
          createdAt: { gte: yearStart, lt: yearEnd },
          ...this.venteOrgFilter(viewer, subsidiaryOrganizationId),
        },
      },
      select: {
        productId: true,
        quantity: true,
        unitPrice: true,
        product: { select: { id: true, name: true } },
      },
    });

    const salesByProduct = new Map<
      string,
      { productName: string; quantitySold: number; revenueFcfa: number }
    >();
    for (const line of lines) {
      const cur = salesByProduct.get(line.productId) ?? {
        productName: line.product.name,
        quantitySold: 0,
        revenueFcfa: 0,
      };
      cur.quantitySold += line.quantity;
      cur.revenueFcfa += Number(line.unitPrice) * line.quantity;
      salesByProduct.set(line.productId, cur);
    }

    const topSellers = [...salesByProduct.entries()]
      .map(([productId, row]) => ({
        productId,
        productName: row.productName,
        quantitySold: row.quantitySold,
        revenueFcfa: row.revenueFcfa,
      }))
      .sort((a, b) => b.revenueFcfa - a.revenueFcfa)
      .slice(0, 10);

    const stocks = await this.prisma.stock.findMany({
      where: {
        quantity: { gt: 0 },
        organization: this.orgWhereForSubsidiary(subsidiaryOrganizationId),
        ...(!isMainOrganizationUser(viewer)
          ? { organizationId: viewer.organisationId }
          : {}),
      },
      select: {
        quantity: true,
        productId: true,
        product: { select: { id: true, name: true } },
      },
    });

    const slowMovers = stocks
      .map((s) => ({
        productId: s.productId,
        productName: s.product.name,
        stockQuantity: s.quantity,
        quantitySoldYear: salesByProduct.get(s.productId)?.quantitySold ?? 0,
      }))
      .filter((s) => s.stockQuantity > 0)
      .sort((a, b) => a.quantitySoldYear - b.quantitySoldYear)
      .slice(0, 10);

    return { topSellers, slowMovers };
  }
}
