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
import {
  assertMainOrgPoleDomain,
  POLE_DOMAIN,
} from '../auth/pole-scope';
import { NotificationService } from '../notification/notification.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  NotificationType,
  SpiritualEventParticipationResponse,
  SpiritualEventStatus,
  type Prisma,
} from '../generated/prisma/client';
import type { RespondSpiritualParticipationDto } from './dto/spiritual-participation.dto';

const participationInclude = {
  employee: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      organizationId: true,
      userId: true,
      organization: { select: { id: true, name: true } },
    },
  },
  user: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      organizationId: true,
      organization: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.SpiritualEventParticipationInclude;

const invitationEventInclude = {
  id: true,
  title: true,
  description: true,
  location: true,
  eventDate: true,
  status: true,
  publishedAt: true,
} satisfies Prisma.SpiritualEventSelect;

export type SpiritualParticipationSummary = {
  accepted: number;
  declined: number;
  pending: number;
  withoutEmployeeRecord: number;
  likelyAttendance: number;
  excluded: number;
  totalInvited: number;
};

type InviteUserRow = {
  id: string;
  organizationId: string;
  email: string;
  employee: { id: string } | null;
  organization: { id: string; name: string; organizationType: 'MAIN' | 'SUBSIDIARY' };
};

type GroupInviteStats = {
  total: number;
  mainOrganization: number;
  subsidiaries: number;
  byOrganization: { organizationId: string; name: string; count: number }[];
};

@Injectable()
export class SpiritualParticipationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  async publishEvent(eventId: string, viewer: AuthenticatedUser) {
    const event = await this.assertEventPublishable(eventId, viewer);
    if (event.publishedAt) {
      throw new BadRequestException(
        'Les invitations ont déjà été envoyées pour cet événement.',
      );
    }

    const { users, stats } = await this.loadGroupWideInvitees();
    const now = new Date();

    const updated = await this.prisma.$transaction(async (tx) => {
      const published = await tx.spiritualEvent.update({
        where: { id: eventId },
        data: {
          publishedAt: now,
          status: SpiritualEventStatus.CONFIRMED,
        },
      });

      if (users.length > 0) {
        await tx.spiritualEventParticipation.createMany({
          data: users.map((user) => ({
            eventId,
            userId: user.id,
            employeeId: user.employee?.id ?? null,
          })),
          skipDuplicates: true,
        });
      }

      return published;
    });

    await this.notifyInvitedUsers(users, event);

    return {
      event: updated,
      groupWide: true,
      invitationsSent: users.length,
      invitationsByOrganization: stats.byOrganization,
      mainOrganizationCount: stats.mainOrganization,
      subsidiaryCount: stats.subsidiaries,
      employeesWithoutAccount: users.filter((u) => u.employee == null).length,
      totalEmployees: users.length,
    };
  }

  /** Ajoute les comptes manquants sur un événement déjà publié. */
  async syncInvitations(eventId: string, viewer: AuthenticatedUser) {
    const event = await this.prisma.spiritualEvent.findUnique({
      where: { id: eventId },
    });
    if (!event) {
      throw new NotFoundException('Événement spirituel introuvable.');
    }
    assertOrganizationResourceAccess(viewer, event.organizationId);
    if (isMainOrganizationUser(viewer)) {
      assertMainOrgPoleDomain(viewer, POLE_DOMAIN.TRADITIONAL);
    }
    if (!event.publishedAt) {
      throw new BadRequestException(
        'Publiez d’abord l’événement avant de synchroniser les invitations.',
      );
    }

    const { users, stats } = await this.loadGroupWideInvitees();
    const existing = await this.prisma.spiritualEventParticipation.findMany({
      where: { eventId },
      select: { userId: true },
    });
    const existingUserIds = new Set(existing.map((row) => row.userId));
    const missing = users.filter((user) => !existingUserIds.has(user.id));

    if (missing.length > 0) {
      await this.prisma.spiritualEventParticipation.createMany({
        data: missing.map((user) => ({
          eventId,
          userId: user.id,
          employeeId: user.employee?.id ?? null,
        })),
        skipDuplicates: true,
      });
      await this.notifyInvitedUsers(missing, event);
    }

    return {
      groupWide: true,
      added: missing.length,
      totalInvited: existingUserIds.size + missing.length,
      invitationsByOrganization: stats.byOrganization,
    };
  }

  async listEventParticipations(eventId: string, viewer: AuthenticatedUser) {
    const event = await this.prisma.spiritualEvent.findUnique({
      where: { id: eventId },
    });
    if (!event) {
      throw new NotFoundException('Événement spirituel introuvable.');
    }
    assertOrganizationResourceAccess(viewer, event.organizationId);
    if (!event.publishedAt) {
      throw new BadRequestException(
        'Les invitations n’ont pas encore été envoyées pour cet événement.',
      );
    }

    const participations = await this.prisma.spiritualEventParticipation.findMany(
      {
        where: { eventId },
        orderBy: [
          { response: 'asc' },
          { user: { lastName: 'asc' } },
          { user: { firstName: 'asc' } },
        ],
        include: participationInclude,
      },
    );

    return {
      event: {
        id: event.id,
        title: event.title,
        eventDate: event.eventDate,
        location: event.location,
        publishedAt: event.publishedAt,
      },
      summary: this.buildSummary(participations),
      participations,
    };
  }

  async listMyInvitations(viewer: AuthenticatedUser) {
    return this.prisma.spiritualEventParticipation.findMany({
      where: {
        userId: viewer.sub,
        event: {
          publishedAt: { not: null },
          status: {
            in: [SpiritualEventStatus.CONFIRMED, SpiritualEventStatus.PLANNED],
          },
        },
      },
      orderBy: { event: { eventDate: 'asc' } },
      include: {
        event: { select: invitationEventInclude },
      },
    });
  }

  async respond(
    participationId: string,
    dto: RespondSpiritualParticipationDto,
    viewer: AuthenticatedUser,
  ) {
    const row = await this.prisma.spiritualEventParticipation.findUnique({
      where: { id: participationId },
      include: { event: true },
    });
    if (!row) {
      throw new NotFoundException('Invitation introuvable.');
    }
    if (row.userId !== viewer.sub) {
      throw new ForbiddenException(
        'Vous ne pouvez répondre qu’à votre propre invitation.',
      );
    }
    if (!row.event.publishedAt) {
      throw new BadRequestException('Cet événement n’est pas encore publié.');
    }
    if (row.event.status === SpiritualEventStatus.CANCELLED) {
      throw new BadRequestException('Cet événement a été annulé.');
    }
    if (row.event.status === SpiritualEventStatus.COMPLETED) {
      throw new BadRequestException('Cet événement est terminé.');
    }

    return this.prisma.spiritualEventParticipation.update({
      where: { id: participationId },
      data: {
        response: dto.response as SpiritualEventParticipationResponse,
        respondedAt: new Date(),
      },
      include: {
        event: { select: invitationEventInclude },
      },
    });
  }

  private async assertEventPublishable(
    eventId: string,
    viewer: AuthenticatedUser,
  ) {
    const event = await this.prisma.spiritualEvent.findUnique({
      where: { id: eventId },
    });
    if (!event) {
      throw new NotFoundException('Événement spirituel introuvable.');
    }
    assertOrganizationResourceAccess(viewer, event.organizationId);
    if (isMainOrganizationUser(viewer)) {
      assertMainOrgPoleDomain(viewer, POLE_DOMAIN.TRADITIONAL);
    }
    if (event.status === SpiritualEventStatus.CANCELLED) {
      throw new BadRequestException(
        'Un événement annulé ne peut pas être publié.',
      );
    }
    if (event.status === SpiritualEventStatus.COMPLETED) {
      throw new BadRequestException(
        'Un événement terminé ne peut pas être publié.',
      );
    }
    return event;
  }

  /**
   * Envoi général groupe : tous les comptes ERP actifs,
   * maison mère et filiales (aucun filtre d’organisation).
   */
  private async loadGroupWideInvitees(): Promise<{
    users: InviteUserRow[];
    stats: GroupInviteStats;
  }> {
    const users = await this.prisma.user.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        organizationId: true,
        email: true,
        employee: { select: { id: true } },
        organization: {
          select: {
            id: true,
            name: true,
            organizationType: true,
          },
        },
      },
      orderBy: [{ organization: { name: 'asc' } }, { email: 'asc' }],
    });

    const byOrg = new Map<string, { organizationId: string; name: string; count: number }>();
    let mainOrganization = 0;
    let subsidiaries = 0;

    for (const user of users) {
      const orgKey = user.organizationId;
      const existing = byOrg.get(orgKey);
      if (existing) {
        existing.count += 1;
      } else {
        byOrg.set(orgKey, {
          organizationId: orgKey,
          name: user.organization.name,
          count: 1,
        });
      }
      if (user.organization.organizationType === 'MAIN') {
        mainOrganization += 1;
      } else {
        subsidiaries += 1;
      }
    }

    return {
      users: users.map((user) => ({
        id: user.id,
        organizationId: user.organizationId,
        email: user.email,
        employee: user.employee,
        organization: {
          id: user.organization.id,
          name: user.organization.name,
          organizationType: user.organization.organizationType,
        },
      })),
      stats: {
        total: users.length,
        mainOrganization,
        subsidiaries,
        byOrganization: [...byOrg.values()].sort((a, b) =>
          a.name.localeCompare(b.name, 'fr'),
        ),
      },
    };
  }

  private async notifyInvitedUsers(
    users: InviteUserRow[],
    event: { id: string; title: string; eventDate: Date | null; location: string | null },
  ): Promise<void> {
    const dateLabel = event.eventDate
      ? event.eventDate.toLocaleDateString('fr-FR')
      : 'date à préciser';
    const locationLabel = event.location?.trim() || 'lieu à préciser';

    const batchSize = 20;
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      await Promise.all(
        batch.map((user) =>
          this.notificationService.create({
            userId: user.id,
            type: NotificationType.SPIRITUAL_EVENT_INVITATION,
            title: 'Invitation — événement spirituel',
            body: `${event.title} — ${dateLabel} — ${locationLabel}. Événement groupe (maison mère et filiales). Répondez dans « Événements spirituels ».`,
            organizationId: user.organizationId,
            metadata: {
              spiritualEventId: event.id,
              eventTitle: event.title,
              href: '/dashboard/evenements-spirituels',
            },
          }),
        ),
      );
    }
  }

  private buildSummary(
    participations: Prisma.SpiritualEventParticipationGetPayload<{
      include: typeof participationInclude;
    }>[],
  ): SpiritualParticipationSummary {
    let accepted = 0;
    let declined = 0;
    let pending = 0;
    let withoutEmployeeRecord = 0;

    for (const row of participations) {
      if (!row.employeeId) {
        withoutEmployeeRecord += 1;
      }
      switch (row.response) {
        case SpiritualEventParticipationResponse.ACCEPTED:
          accepted += 1;
          break;
        case SpiritualEventParticipationResponse.DECLINED:
          declined += 1;
          break;
        case SpiritualEventParticipationResponse.PENDING:
          pending += 1;
          break;
        default: {
          const _exhaustive: never = row.response;
          void _exhaustive;
        }
      }
    }

    return {
      accepted,
      declined,
      pending,
      withoutEmployeeRecord,
      likelyAttendance: accepted,
      excluded: declined + pending,
      totalInvited: participations.length,
    };
  }
}
