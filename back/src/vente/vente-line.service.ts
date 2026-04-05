import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { assertOrganizationResourceAccess } from '../auth/organization-scope';
import { PrismaService } from '../prisma/prisma.service';
import type { VenteLine, Prisma } from '../generated/prisma/client';
import { assertProductUsableForOrganization } from '../product/product-subsidiary-scope.util';
import { assertVenteInViewerScope } from './vente-access.util';

@Injectable()
export class VenteLineService {
  constructor(private readonly prisma: PrismaService) {}

  async findByVenteId(
    venteId: string,
    viewer: AuthenticatedUser,
  ): Promise<VenteLine[]> {
    await assertVenteInViewerScope(this.prisma, venteId, viewer);
    return this.prisma.venteLine.findMany({
      where: { venteId },
      include: { product: true },
    });
  }

  async findOne(id: string, viewer: AuthenticatedUser): Promise<VenteLine> {
    const row = await this.prisma.venteLine.findUnique({
      where: { id },
      include: { product: true, vente: true },
    });
    if (!row) {
      throw new NotFoundException('Ligne de vente introuvable');
    }
    assertOrganizationResourceAccess(viewer, row.vente.organizationId);
    return row;
  }

  async create(
    data: Prisma.VenteLineCreateInput,
    viewer: AuthenticatedUser,
  ): Promise<VenteLine> {
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
      throw new BadRequestException('Vente manquante');
    }
    await assertVenteInViewerScope(this.prisma, venteId, viewer);
    const productConnect =
      data.product &&
      typeof data.product === 'object' &&
      'connect' in data.product &&
      data.product.connect &&
      typeof data.product.connect === 'object' &&
      'id' in data.product.connect
        ? (data.product.connect as { id: string }).id
        : '';
    if (!productConnect) {
      throw new BadRequestException('Produit manquant');
    }
    const vente = await this.prisma.vente.findUnique({
      where: { id: venteId },
      select: { organizationId: true },
    });
    if (!vente) {
      throw new BadRequestException('Vente introuvable');
    }
    await assertProductUsableForOrganization(
      this.prisma,
      productConnect,
      vente.organizationId,
    );
    return this.prisma.venteLine.create({
      data,
      include: { product: true },
    });
  }

  async update(
    id: string,
    data: Prisma.VenteLineUpdateInput,
    viewer: AuthenticatedUser,
  ): Promise<VenteLine> {
    await this.findOne(id, viewer);
    return this.prisma.venteLine.update({
      where: { id },
      data,
      include: { product: true },
    });
  }

  async remove(id: string, viewer: AuthenticatedUser): Promise<VenteLine> {
    const row = await this.findOne(id, viewer);
    await this.prisma.venteLine.delete({ where: { id } });
    return row;
  }
}
