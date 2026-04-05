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
import type { Contrat, Prisma } from '../generated/prisma/client';
import { assertTargetUserInViewerScope } from '../user/user-org-scope.util';

@Injectable()
export class ContratService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(viewer: AuthenticatedUser): Promise<Contrat[]> {
    return this.prisma.contrat.findMany({
      where: organizationListWhere(viewer),
      orderBy: { dateDebut: 'desc' },
      include: { user: true, organization: true },
    });
  }

  async findByUserId(
    userId: string,
    viewer: AuthenticatedUser,
  ): Promise<Contrat[]> {
    await assertTargetUserInViewerScope(this.prisma, userId, viewer);
    return this.prisma.contrat.findMany({
      where: { userId },
      orderBy: { dateDebut: 'desc' },
      include: { organization: true },
    });
  }

  async findOne(id: string, viewer: AuthenticatedUser): Promise<Contrat> {
    const row = await this.prisma.contrat.findUnique({
      where: { id },
      include: { user: true, organization: true },
    });
    if (!row) {
      throw new NotFoundException('Contrat introuvable');
    }
    assertOrganizationResourceAccess(viewer, row.organizationId);
    return row;
  }

  async create(
    data: Prisma.ContratCreateInput,
    viewer: AuthenticatedUser,
  ): Promise<Contrat> {
    const userId = this.extractConnectUserId(data);
    if (!userId) {
      throw new BadRequestException('Salarié (user) manquant');
    }
    await assertTargetUserInViewerScope(this.prisma, userId, viewer);
    const orgId = this.resolveContratOrganizationId(data, viewer);
    assertOrganizationResourceAccess(viewer, orgId);
    const scoped: Prisma.ContratCreateInput = {
      ...data,
      organization: { connect: { id: orgId } },
    };
    return this.prisma.contrat.create({
      data: scoped,
      include: { user: true, organization: true },
    });
  }

  private extractConnectUserId(data: Prisma.ContratCreateInput): string {
    const u = data.user;
    if (
      u &&
      typeof u === 'object' &&
      'connect' in u &&
      u.connect &&
      typeof u.connect === 'object' &&
      'id' in u.connect
    ) {
      return (u.connect as { id: string }).id;
    }
    return '';
  }

  private resolveContratOrganizationId(
    data: Prisma.ContratCreateInput,
    viewer: AuthenticatedUser,
  ): string {
    if (!isMainOrganizationUser(viewer)) {
      return viewer.organisationId;
    }
    const org = data.organization;
    if (
      org &&
      typeof org === 'object' &&
      'connect' in org &&
      org.connect &&
      typeof org.connect === 'object' &&
      'id' in org.connect
    ) {
      return (org.connect as { id: string }).id;
    }
    throw new BadRequestException('Organisation du contrat manquante');
  }

  async update(
    id: string,
    data: Prisma.ContratUpdateInput,
    viewer: AuthenticatedUser,
  ): Promise<Contrat> {
    await this.findOne(id, viewer);
    return this.prisma.contrat.update({
      where: { id },
      data,
      include: { user: true, organization: true },
    });
  }

  async remove(id: string, viewer: AuthenticatedUser): Promise<Contrat> {
    const row = await this.findOne(id, viewer);
    await this.prisma.contrat.delete({ where: { id } });
    return row;
  }
}
