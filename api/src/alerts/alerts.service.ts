import { Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import {
  isMainOrganizationUser,
  organizationListWhere,
} from '../auth/organization-scope';
import { CaslAbilityFactory } from '../casl/casl-ability.factory';
import { PrismaService } from '../prisma/prisma.service';
import {
  BudgetStatus,
  StockOrderStatus,
  VenteStatut,
  OrganizationType,
} from '../generated/prisma/client';
import { toDecimal } from '../lib/decimal.util';

export type DashboardAlertSeverity = 'info' | 'warning' | 'critical';

export type DashboardAlertDto = {
  code: string;
  severity: DashboardAlertSeverity;
  title: string;
  message: string;
  href?: string;
  count?: number;
};

@Injectable()
export class AlertsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly caslAbilityFactory: CaslAbilityFactory,
  ) {}

  async getDashboardAlerts(
    viewer: AuthenticatedUser,
  ): Promise<DashboardAlertDto[]> {
    const ability = await this.caslAbilityFactory.createForUser(viewer);
    const canReadStock = ability.can('read', 'Stock');
    const canReadBudget = ability.can('read', 'Budget');
    const canReadStockOrder = ability.can('read', 'StockOrder');
    const canReadSession = ability.can('read', 'SessionCaisse');

    const alerts: DashboardAlertDto[] = [];
    const orgFilter = organizationListWhere(viewer);
    const subsidiaryId =
      'organizationId' in orgFilter ? orgFilter.organizationId : undefined;

    const stockWhere = subsidiaryId
      ? { organizationId: subsidiaryId }
      : { organization: { organizationType: OrganizationType.SUBSIDIARY } };

    if (canReadStock) {
      const stocks = await this.prisma.stock.findMany({
        where: stockWhere,
        include: { product: { select: { name: true } } },
        take: 100,
      });
      const lowStocks = stocks.filter((s) => s.quantity <= s.minQuantity);

      if (lowStocks.length > 0) {
        alerts.push({
          code: 'STOCK_LOW',
          severity: 'warning',
          title: 'Stock bas',
          message: `${lowStocks.length} produit(s) sous le seuil minimum.`,
          href: '/dashboard/stocks',
          count: lowStocks.length,
        });
      }
    }

    if (canReadStockOrder) {
      const pendingOrders = await this.prisma.stockOrder.count({
        where: {
          ...(subsidiaryId
            ? { subsidiaryOrganizationId: subsidiaryId }
            : {}),
          status: StockOrderStatus.PENDING,
        },
      });
      if (pendingOrders > 0) {
        alerts.push({
          code: 'STOCK_ORDER_PENDING',
          severity: 'info',
          title: 'Commandes en attente',
          message: `${pendingOrders} commande(s) fournisseur en attente.`,
          href: '/dashboard/stocks',
          count: pendingOrders,
        });
      }
    }

    if (
      canReadSession &&
      subsidiaryId &&
      !isMainOrganizationUser(viewer)
    ) {
      const openSession = await this.prisma.sessionCaisse.findFirst({
        where: {
          userId: viewer.sub,
          organizationId: subsidiaryId,
          statut: 'OUVERTE',
        },
      });
      if (openSession) {
        const draftWithLines = await this.prisma.vente.count({
          where: {
            sessionCaisseId: openSession.id,
            status: VenteStatut.DRAFT,
            lines: { some: {} },
          },
        });
        if (draftWithLines > 0) {
          alerts.push({
            code: 'CAISSE_DRAFT_OPEN',
            severity: 'warning',
            title: 'Panier caisse ouvert',
            message:
              'Des ventes en brouillon empêchent la clôture de session.',
            href: '/dashboard/subsidiary/caisse',
            count: draftWithLines,
          });
        }
      }
    }

    if (canReadBudget) {
      const now = new Date();
      const budgets = await this.prisma.budget.findMany({
        where: {
          ...(subsidiaryId ? { subsidiaryOrganizationId: subsidiaryId } : {}),
          status: BudgetStatus.APPROVED,
          year: now.getFullYear(),
          month: now.getMonth() + 1,
        },
        include: {
          lines: {
            include: {
              expenses: { select: { amount: true } },
            },
          },
        },
      });

      let overrunLines = 0;
      for (const budget of budgets) {
        for (const line of budget.lines) {
          const spent = line.expenses.reduce(
            (sum, e) => sum.plus(toDecimal(e.amount)),
            toDecimal(0),
          );
          if (spent.gt(toDecimal(line.amountPlanned))) {
            overrunLines += 1;
          }
        }
      }
      if (overrunLines > 0) {
        alerts.push({
          code: 'BUDGET_OVERRUN',
          severity: 'critical',
          title: 'Budget dépassé',
          message: `${overrunLines} ligne(s) budgétaire(s) au-delà du prévu.`,
          href: '/dashboard/budgets',
          count: overrunLines,
        });
      }
    }

    return alerts;
  }
}
