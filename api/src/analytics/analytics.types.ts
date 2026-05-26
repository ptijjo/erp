import type { BudgetOverviewDto } from '../budget/budget-overview.service';

export type AnalyticsHrOverviewDto = {
  employeesActive: number;
  employeesTotal: number;
  leaveRequestsPending: number;
  bySubsidiary: Array<{
    organizationId: string;
    name: string;
    employeesActive: number;
    leavePending: number;
  }>;
};

export type AnalyticsStockOverviewDto = {
  stockLines: number;
  lowStockLines: number;
  bySubsidiary: Array<{
    organizationId: string;
    name: string;
    stockLines: number;
    lowStockLines: number;
  }>;
};

export type AnalyticsStockOrdersOverviewDto = {
  pending: number;
  confirmed: number;
  cancelled: number;
  confirmedYearTotalFcfa: number;
  byStatus: Array<{ status: string; count: number }>;
};

export type AnalyticsCatalogOverviewDto = {
  productsTotal: number;
  productsOfferedToSubsidiaries: number;
  subsidiariesCount: number;
};

export type AnalyticsSpendingByMonthDto = {
  month: number;
  spentFcfa: number;
};

export type AnalyticsRevenueByMonthDto = {
  month: number;
  revenueFcfa: number;
};

export type AnalyticsFinancialBySubsidiaryDto = {
  organizationId: string;
  name: string;
  revenueFcfa: number;
  expensesFcfa: number;
  plannedFcfa: number;
  utilizationPercent: number;
  overBudget: boolean;
  atRisk: boolean;
};

export type AnalyticsFinancialOverviewDto = {
  revenueFcfa: number;
  expensesFcfa: number;
  netFcfa: number;
  revenueByMonth: AnalyticsRevenueByMonthDto[];
  cashflowByMonth: Array<{
    month: number;
    revenueFcfa: number;
    spentFcfa: number;
  }>;
  bySubsidiary: AnalyticsFinancialBySubsidiaryDto[];
};

export type AnalyticsProductRotationDto = {
  topSellers: Array<{
    productId: string;
    productName: string;
    quantitySold: number;
    revenueFcfa: number;
  }>;
  slowMovers: Array<{
    productId: string;
    productName: string;
    stockQuantity: number;
    quantitySoldYear: number;
  }>;
};

export type GroupAnalyticsOverviewDto = {
  year: number;
  scope: 'MAIN' | 'SUBSIDIARY';
  budget?: BudgetOverviewDto;
  financial?: AnalyticsFinancialOverviewDto;
  productRotation?: AnalyticsProductRotationDto;
  hr?: AnalyticsHrOverviewDto;
  stock?: AnalyticsStockOverviewDto;
  stockOrders?: AnalyticsStockOrdersOverviewDto;
  catalog?: AnalyticsCatalogOverviewDto;
  spendingByMonth?: AnalyticsSpendingByMonthDto[];
};
