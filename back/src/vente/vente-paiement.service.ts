import { Injectable, NotFoundException } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { assertOrganizationResourceAccess } from '../auth/organization-scope';
import { PrismaService } from '../prisma/prisma.service';
import type { VentePaiement, Prisma } from '../generated/prisma/client';
import { assertVenteInViewerScope } from './vente-access.util';

@Injectable()
export class VentePaiementService {
  constructor(private readonly prisma: PrismaService) {}

  async findByVenteId(
    venteId: string,
    viewer: AuthenticatedUser,
  ): Promise<VentePaiement[]> {
    await assertVenteInViewerScope(this.prisma, venteId, viewer);
    return this.prisma.ventePaiement.findMany({ where: { venteId } });
  }

  async findOne(id: string, viewer: AuthenticatedUser): Promise<VentePaiement> {
    const row = await this.prisma.ventePaiement.findUnique({
      where: { id },
      include: { vente: true },
    });
    if (!row) {
      throw new NotFoundException('Paiement de vente introuvable');
    }
    assertOrganizationResourceAccess(viewer, row.vente.organizationId);
    return row;
  }

  async create(
    data: Prisma.VentePaiementCreateInput,
    viewer: AuthenticatedUser,
  ): Promise<VentePaiement> {
    const venteId =
      data.vente &&
      typeof data.vente === 'object' &&
      'connect' in data.vente &&
      data.vente.connect &&
      typeof data.vente.connect === 'object' &&
      'id' in data.vente.connect
        ? (data.vente.connect as { id: string }).id
        : '';
    if (!venteId) {
      throw new NotFoundException('Vente manquante');
    }
    await assertVenteInViewerScope(this.prisma, venteId, viewer);
    return this.prisma.ventePaiement.create({ data });
  }

  async update(
    id: string,
    data: Prisma.VentePaiementUpdateInput,
    viewer: AuthenticatedUser,
  ): Promise<VentePaiement> {
    await this.findOne(id, viewer);
    return this.prisma.ventePaiement.update({ where: { id }, data });
  }

  async remove(id: string, viewer: AuthenticatedUser): Promise<VentePaiement> {
    const row = await this.findOne(id, viewer);
    await this.prisma.ventePaiement.delete({ where: { id } });
    return row;
  }
}
