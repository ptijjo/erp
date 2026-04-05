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
import type { Pointage, Prisma } from '../generated/prisma/client';
import { assertTargetUserInViewerScope } from '../user/user-org-scope.util';

@Injectable()
export class PointageService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(viewer: AuthenticatedUser): Promise<Pointage[]> {
    return this.prisma.pointage.findMany({
      where: organizationListWhere(viewer),
      orderBy: { entreeAt: 'desc' },
      include: {
        user: true,
        organization: true,
        planningShift: true,
        validatedByUser: true,
      },
    });
  }

  async findByUserId(
    userId: string,
    viewer: AuthenticatedUser,
    from?: Date,
    to?: Date,
  ): Promise<Pointage[]> {
    await assertTargetUserInViewerScope(this.prisma, userId, viewer);
    return this.prisma.pointage.findMany({
      where: {
        userId,
        ...(from || to
          ? {
              entreeAt: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      },
      orderBy: { entreeAt: 'desc' },
      include: { organization: true, planningShift: true },
    });
  }

  async findOne(id: string, viewer: AuthenticatedUser): Promise<Pointage> {
    const row = await this.prisma.pointage.findUnique({
      where: { id },
      include: {
        user: true,
        organization: true,
        planningShift: true,
        validatedByUser: true,
      },
    });
    if (!row) {
      throw new NotFoundException('Pointage introuvable');
    }
    assertOrganizationResourceAccess(viewer, row.organizationId);
    return row;
  }

  async create(
    data: Prisma.PointageCreateInput,
    viewer: AuthenticatedUser,
  ): Promise<Pointage> {
    const userId = this.extractUserId(data);
    if (!userId) {
      throw new BadRequestException('Utilisateur manquant');
    }
    await assertTargetUserInViewerScope(this.prisma, userId, viewer);
    const orgId = this.resolveOrgId(data, viewer);
    assertOrganizationResourceAccess(viewer, orgId);
    const scoped: Prisma.PointageCreateInput = {
      ...data,
      organization: { connect: { id: orgId } },
    };
    return this.prisma.pointage.create({
      data: scoped,
      include: { user: true, organization: true, planningShift: true },
    });
  }

  private extractUserId(data: Prisma.PointageCreateInput): string {
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

  private resolveOrgId(
    data: Prisma.PointageCreateInput,
    viewer: AuthenticatedUser,
  ): string {
    if (!isMainOrganizationUser(viewer)) {
      return viewer.organisationId;
    }
    const o = data.organization;
    if (
      o &&
      typeof o === 'object' &&
      'connect' in o &&
      o.connect &&
      typeof o.connect === 'object' &&
      'id' in o.connect
    ) {
      return (o.connect as { id: string }).id;
    }
    throw new BadRequestException('Organisation manquante');
  }

  async update(
    id: string,
    data: Prisma.PointageUpdateInput,
    viewer: AuthenticatedUser,
  ): Promise<Pointage> {
    await this.findOne(id, viewer);
    return this.prisma.pointage.update({
      where: { id },
      data,
      include: { user: true, organization: true, validatedByUser: true },
    });
  }

  async remove(id: string, viewer: AuthenticatedUser): Promise<Pointage> {
    const row = await this.findOne(id, viewer);
    await this.prisma.pointage.delete({ where: { id } });
    return row;
  }
}
