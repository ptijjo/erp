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
import type { Absence, Prisma } from '../generated/prisma/client';
import { assertTargetUserInViewerScope } from '../user/user-org-scope.util';

@Injectable()
export class AbsenceService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(viewer: AuthenticatedUser): Promise<Absence[]> {
    return this.prisma.absence.findMany({
      where: organizationListWhere(viewer),
      orderBy: { debut: 'desc' },
      include: { user: true, organization: true },
    });
  }

  async findByUserId(
    userId: string,
    viewer: AuthenticatedUser,
  ): Promise<Absence[]> {
    await assertTargetUserInViewerScope(this.prisma, userId, viewer);
    return this.prisma.absence.findMany({
      where: { userId },
      orderBy: { debut: 'desc' },
      include: { organization: true },
    });
  }

  async findOne(id: string, viewer: AuthenticatedUser): Promise<Absence> {
    const row = await this.prisma.absence.findUnique({
      where: { id },
      include: { user: true, organization: true },
    });
    if (!row) {
      throw new NotFoundException('Absence introuvable');
    }
    assertOrganizationResourceAccess(viewer, row.organizationId);
    return row;
  }

  async create(
    data: Prisma.AbsenceCreateInput,
    viewer: AuthenticatedUser,
  ): Promise<Absence> {
    const userId = this.extractUserId(data);
    if (!userId) {
      throw new BadRequestException('Utilisateur manquant');
    }
    await assertTargetUserInViewerScope(this.prisma, userId, viewer);
    const orgId = this.resolveOrgId(data, viewer);
    assertOrganizationResourceAccess(viewer, orgId);
    const scoped: Prisma.AbsenceCreateInput = {
      ...data,
      organization: { connect: { id: orgId } },
    };
    return this.prisma.absence.create({
      data: scoped,
      include: { user: true, organization: true },
    });
  }

  private extractUserId(data: Prisma.AbsenceCreateInput): string {
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
    data: Prisma.AbsenceCreateInput,
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
    data: Prisma.AbsenceUpdateInput,
    viewer: AuthenticatedUser,
  ): Promise<Absence> {
    await this.findOne(id, viewer);
    return this.prisma.absence.update({
      where: { id },
      data,
      include: { user: true, organization: true },
    });
  }

  async remove(id: string, viewer: AuthenticatedUser): Promise<Absence> {
    const row = await this.findOne(id, viewer);
    await this.prisma.absence.delete({ where: { id } });
    return row;
  }
}
