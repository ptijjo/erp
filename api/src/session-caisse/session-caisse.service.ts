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
  SessionCaisseStatut,
  VenteStatut,
  type Prisma,
} from '../generated/prisma/client';
import type {
  CloseSessionCaisseDto,
  OpenSessionCaisseDto,
} from './dto/session-caisse.dto';
import {
  computePaymentTotals,
  sessionCaisseInclude,
  type SessionCaisseCurrentDto,
  type SessionCaisseWithDetails,
} from './session-caisse.types';
import { assertSubsidiaryHasSalesCatalog } from '../product/product-subsidiary-scope.util';
import { AccountingService } from '../accounting/accounting.service';

@Injectable()
export class SessionCaisseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountingService: AccountingService,
  ) {}

  async open(
    dto: OpenSessionCaisseDto,
    viewer: AuthenticatedUser,
  ): Promise<SessionCaisseCurrentDto> {
    const orgId = this.requireSubsidiaryViewer(viewer);
    await assertSubsidiaryHasSalesCatalog(this.prisma, orgId);

    const existing = await this.prisma.sessionCaisse.findFirst({
      where: {
        userId: viewer.sub,
        organizationId: orgId,
        statut: SessionCaisseStatut.OUVERTE,
      },
    });
    if (existing) {
      throw new BadRequestException(
        'Vous avez déjà une session de caisse ouverte. Clôturez-la avant d’en ouvrir une nouvelle.',
      );
    }

    const row = await this.prisma.sessionCaisse.create({
      data: {
        organizationId: orgId,
        userId: viewer.sub,
        fondOuverture: dto.fondOuverture,
      },
      include: sessionCaisseInclude,
    });

    return this.withLiveSummary(row);
  }

  async getCurrent(
    viewer: AuthenticatedUser,
  ): Promise<SessionCaisseCurrentDto | null> {
    const orgId = this.requireSubsidiaryViewer(viewer);
    const row = await this.prisma.sessionCaisse.findFirst({
      where: {
        userId: viewer.sub,
        organizationId: orgId,
        statut: SessionCaisseStatut.OUVERTE,
      },
      include: sessionCaisseInclude,
    });
    if (!row) {
      return null;
    }
    return this.withLiveSummary(row);
  }

  /** Historique des sessions de l’utilisateur connecté (profil caisse). */
  async findMine(
    viewer: AuthenticatedUser,
    limit = 30,
  ): Promise<SessionCaisseWithDetails[]> {
    const where: Prisma.SessionCaisseWhereInput = { userId: viewer.sub };
    if (!isMainOrganizationUser(viewer)) {
      where.organizationId = viewer.organisationId;
    }

    return this.prisma.sessionCaisse.findMany({
      where,
      orderBy: { openedAt: 'desc' },
      take: limit,
      include: sessionCaisseInclude,
    });
  }

  async findOne(
    id: string,
    viewer: AuthenticatedUser,
  ): Promise<SessionCaisseWithDetails> {
    const row = await this.prisma.sessionCaisse.findUnique({
      where: { id },
      include: sessionCaisseInclude,
    });
    if (!row) {
      throw new NotFoundException('Session de caisse introuvable.');
    }
    assertOrganizationResourceAccess(viewer, row.organizationId);
    if (
      !isMainOrganizationUser(viewer) &&
      row.userId !== viewer.sub &&
      row.organizationId !== viewer.organisationId
    ) {
      throw new ForbiddenException();
    }
    return row;
  }

  async close(
    id: string,
    dto: CloseSessionCaisseDto,
    viewer: AuthenticatedUser,
  ): Promise<SessionCaisseWithDetails> {
    const session = await this.prisma.sessionCaisse.findUnique({
      where: { id },
      include: {
        ventes: {
          where: { status: VenteStatut.CONFIRMED },
          include: { paiements: true },
        },
      },
    });
    if (!session) {
      throw new NotFoundException('Session de caisse introuvable.');
    }
    if (session.statut !== SessionCaisseStatut.OUVERTE) {
      throw new BadRequestException('Cette session est déjà clôturée.');
    }
    if (session.userId !== viewer.sub && !isMainOrganizationUser(viewer)) {
      throw new ForbiddenException(
        'Seul le caissier ayant ouvert la session peut la clôturer.',
      );
    }
    assertOrganizationResourceAccess(viewer, session.organizationId);

    const draftsWithLines = await this.prisma.vente.count({
      where: {
        sessionCaisseId: id,
        status: VenteStatut.DRAFT,
        lines: { some: {} },
      },
    });
    if (draftsWithLines > 0) {
      throw new BadRequestException(
        `${draftsWithLines} vente(s) en brouillon : validez ou annulez-les avant la fin de service.`,
      );
    }

    await this.prisma.vente.updateMany({
      where: {
        sessionCaisseId: id,
        status: VenteStatut.DRAFT,
        lines: { none: {} },
      },
      data: { status: VenteStatut.CANCELLED },
    });

    const remainingDrafts = await this.prisma.vente.count({
      where: {
        sessionCaisseId: id,
        status: VenteStatut.DRAFT,
      },
    });
    if (remainingDrafts > 0) {
      throw new BadRequestException(
        `${remainingDrafts} vente(s) en brouillon : validez ou annulez-les avant la fin de service.`,
      );
    }

    const totals = computePaymentTotals(session.ventes);
    const fondOuverture = Number(session.fondOuverture);
    const theoriqueEspeces = fondOuverture + totals.totalEspecesFcfa;
    const ecartCloture = dto.fondCloture - theoriqueEspeces;

    const closed = await this.prisma.sessionCaisse.update({
      where: { id },
      data: {
        statut: SessionCaisseStatut.CLOTUREE,
        closedAt: new Date(),
        fondCloture: dto.fondCloture,
        ecartCloture,
        commentaireCloture: dto.commentaireCloture?.trim() || null,
        closedByUserId: viewer.sub,
        totalVentesFcfa: totals.totalVentesFcfa,
        totalEspecesFcfa: totals.totalEspecesFcfa,
        totalCarteFcfa: totals.totalCarteFcfa,
        totalMobileMoneyFcfa: totals.totalMobileMoneyFcfa,
        nombreVentes: totals.nombreVentes,
      },
      include: sessionCaisseInclude,
    });

    void this.accountingService.autoPostFromSessionClose(closed.id);

    return closed;
  }

  /** Session ouverte obligatoire pour encaisser (filiale). */
  async requireOpenSessionForViewer(viewer: AuthenticatedUser) {
    const orgId = this.requireSubsidiaryViewer(viewer);
    await assertSubsidiaryHasSalesCatalog(this.prisma, orgId);
    const session = await this.prisma.sessionCaisse.findFirst({
      where: {
        userId: viewer.sub,
        organizationId: orgId,
        statut: SessionCaisseStatut.OUVERTE,
      },
    });
    if (!session) {
      throw new BadRequestException(
        'Démarrez votre service de caisse (fond d’ouverture) avant d’enregistrer des ventes.',
      );
    }
    return session;
  }

  async assertVenteBelongsToOpenSession(
    venteId: string,
    viewer: AuthenticatedUser,
  ): Promise<void> {
    const session = await this.requireOpenSessionForViewer(viewer);
    const vente = await this.prisma.vente.findUnique({
      where: { id: venteId },
      select: { sessionCaisseId: true, userId: true },
    });
    if (!vente) {
      throw new NotFoundException('Vente introuvable.');
    }
    if (vente.sessionCaisseId !== session.id) {
      throw new BadRequestException(
        'Cette vente n’appartient pas à votre session de caisse en cours.',
      );
    }
    if (vente.userId && vente.userId !== viewer.sub) {
      throw new ForbiddenException();
    }
  }

  private withLiveSummary(
    row: SessionCaisseWithDetails,
  ): SessionCaisseCurrentDto {
    const confirmed = row.ventes.filter((v) => v.status === VenteStatut.CONFIRMED);
    const totals = computePaymentTotals(confirmed);
    const fondOuverture = Number(row.fondOuverture);
    return {
      ...row,
      live: {
        ...totals,
        theoriqueCaisseEspecesFcfa: fondOuverture + totals.totalEspecesFcfa,
      },
    };
  }

  private requireSubsidiaryViewer(viewer: AuthenticatedUser): string {
    if (isMainOrganizationUser(viewer)) {
      throw new ForbiddenException(
        'Les sessions de caisse sont gérées par les filiales.',
      );
    }
    return viewer.organisationId;
  }
}
