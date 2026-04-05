import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import {
  assertOrganizationResourceAccess,
  organizationListWhere,
} from '../auth/organization-scope';
import { PrismaService } from '../prisma/prisma.service';
import type { Vente, Prisma } from '../generated/prisma/client';

@Injectable()
export class VenteService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(viewer: AuthenticatedUser): Promise<Vente[]> {
    return this.prisma.vente.findMany({
      where: organizationListWhere(viewer),
      orderBy: { createdAt: 'desc' },
      include: {
        organization: true,
        user: true,
        sessionCaisse: true,
        lignes: { include: { product: true } },
        paiements: true,
      },
    });
  }

  async findByOrganizationId(
    organizationId: string,
    viewer: AuthenticatedUser,
  ): Promise<Vente[]> {
    assertOrganizationResourceAccess(viewer, organizationId);
    return this.prisma.vente.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      include: {
        organization: { select: { id: true, name: true, organizationType: true } },
        user: true,
        sessionCaisse: true,
        lignes: { include: { product: true } },
        paiements: true,
      },
    });
  }

  async findOne(id: string, viewer: AuthenticatedUser): Promise<Vente> {
    const row = await this.prisma.vente.findUnique({
      where: { id },
      include: {
        organization: true,
        user: true,
        sessionCaisse: true,
        lignes: { include: { product: true } },
        paiements: true,
      },
    });
    if (!row) {
      throw new NotFoundException('Vente introuvable');
    }
    assertOrganizationResourceAccess(viewer, row.organizationId);
    return row;
  }

  async create(
    data: Prisma.VenteCreateInput,
    viewer: AuthenticatedUser,
  ): Promise<Vente> {
    const orgId = this.resolveVenteOrganizationId(data, viewer);
    assertOrganizationResourceAccess(viewer, orgId);
    const scopedData: Prisma.VenteCreateInput = {
      ...data,
      organization: { connect: { id: orgId } },
    };
    return this.prisma.vente.create({
      data: scopedData,
      include: {
        organization: true,
        user: true,
        sessionCaisse: true,
        lignes: { include: { product: true } },
        paiements: true,
      },
    });
  }

  private resolveVenteOrganizationId(
    data: Prisma.VenteCreateInput,
    viewer: AuthenticatedUser,
  ): string {
    const connectId =
      data.organization &&
      typeof data.organization === 'object' &&
      'connect' in data.organization &&
      data.organization.connect &&
      typeof data.organization.connect === 'object' &&
      'id' in data.organization.connect
        ? (data.organization.connect as { id: string }).id
        : undefined;
    if (viewer.organizationType === 'SUBSIDIARY') {
      return viewer.organisationId;
    }
    if (!connectId) {
      throw new BadRequestException('Organisation de la vente manquante');
    }
    return connectId;
  }

  async update(
    id: string,
    data: Prisma.VenteUpdateInput,
    viewer: AuthenticatedUser,
  ): Promise<Vente> {
    await this.findOne(id, viewer);
    return this.prisma.vente.update({
      where: { id },
      data,
      include: {
        organization: true,
        user: true,
        sessionCaisse: true,
        lignes: { include: { product: true } },
        paiements: true,
      },
    });
  }

  async remove(id: string, viewer: AuthenticatedUser): Promise<Vente> {
    const row = await this.findOne(id, viewer);
    await this.prisma.vente.delete({ where: { id } });
    return row;
  }
}
