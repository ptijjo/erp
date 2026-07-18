import { Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import {
  assertOrganizationResourceAccess,
  isMainOrganizationUser,
} from '../auth/organization-scope';
import { PrismaService } from '../prisma/prisma.service';
import { SessionCaisseStatut } from '../generated/prisma/client';
import type { TreasuryOverviewQueryDto } from './dto/treasury-overview.dto';

@Injectable()
export class TreasuryOverviewService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(viewer: AuthenticatedUser, query: TreasuryOverviewQueryDto) {
    const now = new Date();
    const year = query.year ?? now.getFullYear();
    const month = query.month ?? now.getMonth() + 1;

    let organizationId: string | undefined;
    if (isMainOrganizationUser(viewer)) {
      organizationId = query.organizationId?.trim() || undefined;
      if (organizationId) {
        assertOrganizationResourceAccess(viewer, organizationId);
      }
    } else {
      organizationId = viewer.organisationId;
    }

    const periodStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const periodEnd = new Date(Date.UTC(year, month, 1, 0, 0, 0));

    const sessions = await this.prisma.sessionCaisse.findMany({
      where: {
        statut: SessionCaisseStatut.CLOTUREE,
        closedAt: { gte: periodStart, lt: periodEnd },
        ...(organizationId ? { organizationId } : {}),
      },
      select: {
        id: true,
        organizationId: true,
        fondOuverture: true,
        fondCloture: true,
        ecartCloture: true,
        totalVentesFcfa: true,
        totalEspecesFcfa: true,
        totalCarteFcfa: true,
        totalMobileMoneyFcfa: true,
        nombreVentes: true,
        closedAt: true,
        organization: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { closedAt: 'desc' },
    });

    let totalVentes = 0;
    let totalEspeces = 0;
    let totalCarte = 0;
    let totalMobileMoney = 0;
    let totalEcart = 0;
    let nombreSessions = sessions.length;
    let nombreVentes = 0;

    for (const s of sessions) {
      totalVentes += Number(s.totalVentesFcfa ?? 0);
      totalEspeces += Number(s.totalEspecesFcfa ?? 0);
      totalCarte += Number(s.totalCarteFcfa ?? 0);
      totalMobileMoney += Number(s.totalMobileMoneyFcfa ?? 0);
      totalEcart += Number(s.ecartCloture ?? 0);
      nombreVentes += s.nombreVentes ?? 0;
    }

    const openSessions = await this.prisma.sessionCaisse.count({
      where: {
        statut: SessionCaisseStatut.OUVERTE,
        ...(organizationId ? { organizationId } : {}),
      },
    });

    return {
      year,
      month,
      organizationId: organizationId ?? null,
      summary: {
        nombreSessions,
        sessionsOuvertes: openSessions,
        nombreVentes,
        totalVentesFcfa: totalVentes,
        totalEspecesFcfa: totalEspeces,
        totalCarteFcfa: totalCarte,
        totalMobileMoneyFcfa: totalMobileMoney,
        totalEcartClotureFcfa: totalEcart,
      },
      sessions: sessions.map((s) => ({
        id: s.id,
        organizationId: s.organizationId,
        organization: s.organization,
        closedAt: s.closedAt,
        fondOuverture: Number(s.fondOuverture),
        fondCloture: s.fondCloture != null ? Number(s.fondCloture) : null,
        ecartCloture: s.ecartCloture != null ? Number(s.ecartCloture) : null,
        totalVentesFcfa: Number(s.totalVentesFcfa ?? 0),
        totalEspecesFcfa: Number(s.totalEspecesFcfa ?? 0),
        totalCarteFcfa: Number(s.totalCarteFcfa ?? 0),
        totalMobileMoneyFcfa: Number(s.totalMobileMoneyFcfa ?? 0),
        nombreVentes: s.nombreVentes ?? 0,
      })),
    };
  }
}
