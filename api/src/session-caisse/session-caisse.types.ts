import type { Prisma } from '../generated/prisma/client';
import { ModePaiement, VenteStatut } from '../generated/prisma/client';

export const sessionCaisseInclude = {
  organization: {
    select: { id: true, name: true, slug: true, organizationType: true },
  },
  user: {
    select: { id: true, email: true, firstName: true, lastName: true },
  },
  closedBy: {
    select: { id: true, email: true, firstName: true, lastName: true },
  },
  ventes: {
    orderBy: { createdAt: 'asc' as const },
    include: {
      paiements: true,
      lines: {
        include: {
          product: { select: { id: true, name: true } },
        },
      },
    },
  },
} as const;

export type SessionCaisseWithDetails = Prisma.SessionCaisseGetPayload<{
  include: typeof sessionCaisseInclude;
}>;

export type SessionCaisseLiveSummary = {
  nombreVentes: number;
  totalVentesFcfa: number;
  totalEspecesFcfa: number;
  totalCarteFcfa: number;
  totalMobileMoneyFcfa: number;
  theoriqueCaisseEspecesFcfa: number;
};

export type SessionCaisseCurrentDto = SessionCaisseWithDetails & {
  live: SessionCaisseLiveSummary;
};

export function computePaymentTotals(
  ventes: Array<{
    totalAmount: Prisma.Decimal;
    paiements: Array<{ modePaiement: ModePaiement; amount: Prisma.Decimal }>;
  }>,
): {
  totalVentesFcfa: number;
  totalEspecesFcfa: number;
  totalCarteFcfa: number;
  totalMobileMoneyFcfa: number;
  nombreVentes: number;
} {
  let totalEspecesFcfa = 0;
  let totalCarteFcfa = 0;
  let totalMobileMoneyFcfa = 0;
  let totalVentesFcfa = 0;

  for (const v of ventes) {
    totalVentesFcfa += Number(v.totalAmount);
    for (const p of v.paiements) {
      const amt = Number(p.amount);
      if (p.modePaiement === ModePaiement.ESPECES) {
        totalEspecesFcfa += amt;
      } else if (p.modePaiement === ModePaiement.CARTE) {
        totalCarteFcfa += amt;
      } else {
        totalMobileMoneyFcfa += amt;
      }
    }
  }

  return {
    nombreVentes: ventes.length,
    totalVentesFcfa,
    totalEspecesFcfa,
    totalCarteFcfa,
    totalMobileMoneyFcfa,
  };
}
