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
import type { PlanningShift, Prisma } from '../generated/prisma/client';
import { assertTargetUserInViewerScope } from '../user/user-org-scope.util';

@Injectable()
export class PlanningShiftService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(viewer: AuthenticatedUser): Promise<PlanningShift[]> {
    return this.prisma.planningShift.findMany({
      where: organizationListWhere(viewer),
      orderBy: { startsAt: 'desc' },
      include: { user: true, organization: true },
    });
  }

  async findByOrganizationId(
    organizationId: string,
    viewer: AuthenticatedUser,
    from?: Date,
    to?: Date,
  ): Promise<PlanningShift[]> {
    assertOrganizationResourceAccess(viewer, organizationId);
    return this.prisma.planningShift.findMany({
      where: {
        organizationId,
        ...(from || to
          ? {
              startsAt: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      },
      orderBy: { startsAt: 'asc' },
      include: { user: true },
    });
  }

  async findByUserId(
    userId: string,
    viewer: AuthenticatedUser,
    from?: Date,
    to?: Date,
  ): Promise<PlanningShift[]> {
    await assertTargetUserInViewerScope(this.prisma, userId, viewer);
    return this.prisma.planningShift.findMany({
      where: {
        userId,
        ...(from || to
          ? {
              startsAt: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      },
      orderBy: { startsAt: 'asc' },
      include: { organization: true },
    });
  }

  async findOne(id: string, viewer: AuthenticatedUser): Promise<PlanningShift> {
    const row = await this.prisma.planningShift.findUnique({
      where: { id },
      include: { user: true, organization: true, pointages: true },
    });
    if (!row) {
      throw new NotFoundException('Créneau introuvable');
    }
    assertOrganizationResourceAccess(viewer, row.organizationId);
    return row;
  }

  async create(
    data: Prisma.PlanningShiftCreateInput,
    viewer: AuthenticatedUser,
  ): Promise<PlanningShift> {
    const userId = this.extractUserId(data);
    if (!userId) {
      throw new BadRequestException('Utilisateur manquant');
    }
    await assertTargetUserInViewerScope(this.prisma, userId, viewer);
    const orgId = this.resolveOrgId(data, viewer);
    assertOrganizationResourceAccess(viewer, orgId);
    const scoped: Prisma.PlanningShiftCreateInput = {
      ...data,
      organization: { connect: { id: orgId } },
    };
    return this.prisma.planningShift.create({
      data: scoped,
      include: { user: true, organization: true },
    });
  }

  private extractUserId(data: Prisma.PlanningShiftCreateInput): string {
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
    data: Prisma.PlanningShiftCreateInput,
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
    data: Prisma.PlanningShiftUpdateInput,
    viewer: AuthenticatedUser,
  ): Promise<PlanningShift> {
    await this.findOne(id, viewer);
    return this.prisma.planningShift.update({
      where: { id },
      data,
      include: { user: true, organization: true },
    });
  }

  async remove(id: string, viewer: AuthenticatedUser): Promise<PlanningShift> {
    const row = await this.findOne(id, viewer);
    await this.prisma.planningShift.delete({ where: { id } });
    return row;
  }
}
