import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import {
  assertOrganizationResourceAccess,
  isMainOrganizationUser,
  organizationListWhere,
} from '../auth/organization-scope';
import { PrismaService } from '../prisma/prisma.service';
import type { SessionCaisse, Prisma } from '../generated/prisma/client';

@Injectable()
export class SessionCaisseService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(viewer: AuthenticatedUser): Promise<SessionCaisse[]> {
    return this.prisma.sessionCaisse.findMany({
      where: organizationListWhere(viewer),
      orderBy: { openedAt: 'desc' },
      include: { organization: true, user: true, closedByUser: true },
    });
  }

  async findOpenByOrganization(
    organizationId: string,
    viewer: AuthenticatedUser,
  ): Promise<SessionCaisse | null> {
    assertOrganizationResourceAccess(viewer, organizationId);
    return this.prisma.sessionCaisse.findFirst({
      where: { organizationId, statut: 'OUVERTE' },
      include: { user: true },
    });
  }

  async findOne(id: string, viewer: AuthenticatedUser): Promise<SessionCaisse> {
    const row = await this.prisma.sessionCaisse.findUnique({
      where: { id },
      include: {
        organization: true,
        user: true,
        closedByUser: true,
        ventes: true,
      },
    });
    if (!row) {
      throw new NotFoundException('Session de caisse introuvable');
    }
    assertOrganizationResourceAccess(viewer, row.organizationId);
    return row;
  }

  async create(
    data: Prisma.SessionCaisseCreateInput,
    viewer: AuthenticatedUser,
  ): Promise<SessionCaisse> {
    const orgId = this.resolveSessionOrganizationId(data, viewer);
    assertOrganizationResourceAccess(viewer, orgId);
    const scoped: Prisma.SessionCaisseCreateInput = {
      ...data,
      organization: { connect: { id: orgId } },
    };
    return this.prisma.sessionCaisse.create({
      data: scoped,
      include: { organization: true, user: true },
    });
  }

  private resolveSessionOrganizationId(
    data: Prisma.SessionCaisseCreateInput,
    viewer: AuthenticatedUser,
  ): string {
    if (!isMainOrganizationUser(viewer)) {
      return viewer.organisationId;
    }
    const connectId =
      data.organization &&
      typeof data.organization === 'object' &&
      'connect' in data.organization &&
      data.organization.connect &&
      typeof data.organization.connect === 'object' &&
      'id' in data.organization.connect
        ? (data.organization.connect as { id: string }).id
        : undefined;
    if (!connectId) {
      throw new BadRequestException('Organisation de la session manquante');
    }
    return connectId;
  }

  async update(
    id: string,
    data: Prisma.SessionCaisseUpdateInput,
    viewer: AuthenticatedUser,
  ): Promise<SessionCaisse> {
    await this.findOne(id, viewer);
    return this.prisma.sessionCaisse.update({
      where: { id },
      data,
      include: { organization: true, user: true, closedByUser: true },
    });
  }

  async remove(id: string, viewer: AuthenticatedUser): Promise<SessionCaisse> {
    const row = await this.findOne(id, viewer);
    await this.prisma.sessionCaisse.delete({ where: { id } });
    return row;
  }
}
