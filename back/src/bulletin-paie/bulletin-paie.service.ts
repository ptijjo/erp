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
import type { BulletinPaie, Prisma } from '../generated/prisma/client';
import { assertTargetUserInViewerScope } from '../user/user-org-scope.util';

@Injectable()
export class BulletinPaieService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(viewer: AuthenticatedUser): Promise<BulletinPaie[]> {
    return this.prisma.bulletinPaie.findMany({
      where: organizationListWhere(viewer),
      orderBy: [{ annee: 'desc' }, { mois: 'desc' }],
      include: {
        user: true,
        organization: true,
        lignes: { orderBy: { ordre: 'asc' } },
      },
    });
  }

  async findOne(id: string, viewer: AuthenticatedUser): Promise<BulletinPaie> {
    const row = await this.prisma.bulletinPaie.findUnique({
      where: { id },
      include: {
        user: true,
        organization: true,
        lignes: { orderBy: { ordre: 'asc' } },
      },
    });
    if (!row) {
      throw new NotFoundException('Bulletin de paie introuvable');
    }
    assertOrganizationResourceAccess(viewer, row.organizationId);
    return row;
  }

  async findByPeriode(
    organizationId: string,
    annee: number,
    mois: number,
    viewer: AuthenticatedUser,
  ): Promise<BulletinPaie[]> {
    assertOrganizationResourceAccess(viewer, organizationId);
    return this.prisma.bulletinPaie.findMany({
      where: { organizationId, annee, mois },
      include: { user: true, lignes: true },
    });
  }

  async create(
    data: Prisma.BulletinPaieCreateInput,
    viewer: AuthenticatedUser,
  ): Promise<BulletinPaie> {
    const userId = this.extractUserId(data);
    if (!userId) {
      throw new BadRequestException('Utilisateur manquant');
    }
    await assertTargetUserInViewerScope(this.prisma, userId, viewer);
    const orgId = this.resolveOrgId(data, viewer);
    assertOrganizationResourceAccess(viewer, orgId);
    const scoped: Prisma.BulletinPaieCreateInput = {
      ...data,
      organization: { connect: { id: orgId } },
    };
    return this.prisma.bulletinPaie.create({
      data: scoped,
      include: { user: true, organization: true, lignes: true },
    });
  }

  private extractUserId(data: Prisma.BulletinPaieCreateInput): string {
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
    data: Prisma.BulletinPaieCreateInput,
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
    data: Prisma.BulletinPaieUpdateInput,
    viewer: AuthenticatedUser,
  ): Promise<BulletinPaie> {
    await this.findOne(id, viewer);
    return this.prisma.bulletinPaie.update({
      where: { id },
      data,
      include: { user: true, organization: true, lignes: true },
    });
  }

  async remove(id: string, viewer: AuthenticatedUser): Promise<BulletinPaie> {
    const row = await this.findOne(id, viewer);
    await this.prisma.bulletinPaie.delete({ where: { id } });
    return row;
  }
}
