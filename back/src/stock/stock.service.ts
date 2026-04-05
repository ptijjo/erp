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
  organizationListWhere,
} from '../auth/organization-scope';
import {
  assertProductUsableForOrganization,
  productCatalogWhereForViewer,
} from '../product/product-subsidiary-scope.util';
import { PrismaService } from '../prisma/prisma.service';
import type { Stock, Prisma } from '../generated/prisma/client';

function productIdFromStockCreateInput(
  data: Prisma.StockCreateInput,
): string | null {
  const c =
    data.product &&
    typeof data.product === 'object' &&
    'connect' in data.product &&
    data.product.connect &&
    typeof data.product.connect === 'object' &&
    'id' in data.product.connect
      ? (data.product.connect as { id: string }).id
      : null;
  return c ?? null;
}

@Injectable()
export class StockService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(viewer: AuthenticatedUser): Promise<Stock[]> {
    const baseWhere = organizationListWhere(viewer);
    const where: Prisma.StockWhereInput = { ...baseWhere };
    if (!isMainOrganizationUser(viewer)) {
      where.product = await productCatalogWhereForViewer(
        this.prisma,
        viewer,
      );
    }
    return this.prisma.stock.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: { product: true, organization: true },
    });
  }

  async findOne(id: string, viewer: AuthenticatedUser): Promise<Stock> {
    const row = await this.prisma.stock.findUnique({
      where: { id },
      include: { product: true, organization: true },
    });
    if (!row) {
      throw new NotFoundException('Stock introuvable');
    }
    assertOrganizationResourceAccess(viewer, row.organizationId);
    if (
      !isMainOrganizationUser(viewer) &&
      !row.product.offeredToSubsidiaries
    ) {
      throw new ForbiddenException(
        'Ce stock concerne un produit non proposé aux filiales.',
      );
    }
    return row;
  }

  async findByOrganizationAndProduct(
    organizationId: string,
    productId: string,
    viewer: AuthenticatedUser,
  ): Promise<Stock | null> {
    assertOrganizationResourceAccess(viewer, organizationId);
    const row = await this.prisma.stock.findUnique({
      where: {
        organizationId_productId: { organizationId, productId },
      },
      include: { product: true, organization: true },
    });
    if (!row) {
      return null;
    }
    if (
      !isMainOrganizationUser(viewer) &&
      !row.product.offeredToSubsidiaries
    ) {
      throw new ForbiddenException(
        'Ce stock concerne un produit non proposé aux filiales.',
      );
    }
    return row;
  }

  async create(
    data: Prisma.StockCreateInput,
    viewer: AuthenticatedUser,
  ): Promise<Stock> {
    const orgId = this.resolveStockOrganizationId(data, viewer);
    assertOrganizationResourceAccess(viewer, orgId);
    const productId = productIdFromStockCreateInput(data);
    if (!productId) {
      throw new BadRequestException('Produit du stock manquant');
    }
    await assertProductUsableForOrganization(
      this.prisma,
      productId,
      orgId,
    );
    const scoped: Prisma.StockCreateInput = {
      ...data,
      organization: { connect: { id: orgId } },
    };
    try {
      return await this.prisma.stock.create({
        data: scoped,
        include: { product: true, organization: true },
      });
    } catch {
      throw new BadRequestException(
        'Stock déjà existant pour ce couple organisation / produit',
      );
    }
  }

  private resolveStockOrganizationId(
    data: Prisma.StockCreateInput,
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
      throw new BadRequestException('Organisation du stock manquante');
    }
    return connectId;
  }

  async update(
    id: string,
    data: Prisma.StockUpdateInput,
    viewer: AuthenticatedUser,
  ): Promise<Stock> {
    await this.findOne(id, viewer);
    return this.prisma.stock.update({
      where: { id },
      data,
      include: { product: true, organization: true },
    });
  }

  async upsertForOrgProduct(
    organizationId: string,
    productId: string,
    data: {
      quantity?: number;
      minQuantity?: number;
      maxQuantity?: number | null;
    },
    viewer: AuthenticatedUser,
  ): Promise<Stock> {
    const orgId = isMainOrganizationUser(viewer)
      ? organizationId
      : viewer.organisationId;
    assertOrganizationResourceAccess(viewer, orgId);
    await assertProductUsableForOrganization(this.prisma, productId, orgId);
    return this.prisma.stock.upsert({
      where: {
        organizationId_productId: { organizationId: orgId, productId },
      },
      create: {
        organizationId: orgId,
        productId,
        quantity: data.quantity ?? 0,
        minQuantity: data.minQuantity ?? 0,
        maxQuantity: data.maxQuantity ?? undefined,
      },
      update: {
        ...(data.quantity !== undefined ? { quantity: data.quantity } : {}),
        ...(data.minQuantity !== undefined
          ? { minQuantity: data.minQuantity }
          : {}),
        ...(data.maxQuantity !== undefined
          ? { maxQuantity: data.maxQuantity }
          : {}),
      },
      include: { product: true, organization: true },
    });
  }

  async remove(id: string, viewer: AuthenticatedUser): Promise<Stock> {
    const row = await this.findOne(id, viewer);
    await this.prisma.stock.delete({ where: { id } });
    return row;
  }
}
