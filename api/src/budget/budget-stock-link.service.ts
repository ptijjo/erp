import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';
import {
  BudgetLineCategory,
  BudgetStatus,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type StockOrderForBudget = {
  id: string;
  subsidiaryOrganizationId: string;
  quantity: number;
  unitPrice: Prisma.Decimal;
  createdAt: Date;
  product: { name: string };
  requestedByUserId: string | null;
};

type BudgetLinkClient = Pick<
  PrismaService,
  'budget' | 'budgetLine' | 'budgetExpense'
>;

/**
 * À la confirmation d’une commande stock, enregistre la sortie sur la ligne STOCK
 * du budget mensuel validé de la filiale (si elle existe).
 */
@Injectable()
export class BudgetStockLinkService {
  private readonly log = new Logger(BudgetStockLinkService.name);

  constructor(private readonly prisma: PrismaService) {}

  async recordExpenseForConfirmedStockOrder(
    order: StockOrderForBudget,
    tx?: Prisma.TransactionClient,
  ): Promise<{ linked: boolean; reason?: string }> {
    const db = (tx ?? this.prisma) as BudgetLinkClient;

    const existing = await db.budgetExpense.findUnique({
      where: { stockOrderId: order.id },
      select: { id: true },
    });
    if (existing) {
      return { linked: true };
    }

    const year = order.createdAt.getFullYear();
    const month = order.createdAt.getMonth() + 1;

    const budget = await db.budget.findFirst({
      where: {
        subsidiaryOrganizationId: order.subsidiaryOrganizationId,
        year,
        month,
        status: BudgetStatus.APPROVED,
      },
      select: { id: true },
    });
    if (!budget) {
      const reason = `Aucun budget validé pour ${month}/${year}.`;
      this.log.warn(`Commande ${order.id} : ${reason}`);
      return { linked: false, reason };
    }

    const stockLine = await db.budgetLine.findFirst({
      where: {
        budgetId: budget.id,
        category: BudgetLineCategory.STOCK,
      },
      select: { id: true, amountPlanned: true },
    });
    if (!stockLine) {
      const reason =
        'Aucune ligne « Gestion de stock » sur le budget du mois.';
      this.log.warn(`Commande ${order.id} : ${reason}`);
      return { linked: false, reason };
    }

    const amount = Number(order.unitPrice) * order.quantity;
    const agg = await db.budgetExpense.aggregate({
      where: { budgetLineId: stockLine.id },
      _sum: { amount: true },
    });
    const spent = Number(agg._sum.amount ?? 0);
    const planned = Number(stockLine.amountPlanned.toString());
    if (spent + amount > planned) {
      const reason = `Solde ligne stock insuffisant (${Math.max(0, planned - spent)} FCFA restants, ${amount} demandés).`;
      this.log.warn(`Commande ${order.id} : ${reason}`);
      return { linked: false, reason };
    }

    await db.budgetExpense.create({
      data: {
        budgetLineId: stockLine.id,
        amount,
        label: `Commande stock — ${order.product.name}`,
        spentAt: order.createdAt,
        recordedByUserId: order.requestedByUserId,
        stockOrderId: order.id,
      },
    });

    return { linked: true };
  }
}
