import { Injectable, NotFoundException } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import {
  assertOrganizationResourceAccess,
  isMainOrganizationUser,
  organizationListWhere,
} from '../auth/organization-scope';
import { PrismaService } from '../prisma/prisma.service';
import { OrganizationType, StockMovementType, type Prisma } from '../generated/prisma/client';
import { recordStockMovement } from './stock-movement.util';
import type {
  RecordStockMovementInput,
  StockMovementWithProduct,
} from './stock-movement.types';

const movementInclude = {
  product: { select: { id: true, name: true, qrCode: true } },
  organization: { select: { id: true, name: true, slug: true } },
} as const;

@Injectable()
export class StockMovementService {
  constructor(private readonly prisma: PrismaService) {}

  static async recordOnTransaction(
    tx: Prisma.TransactionClient,
    input: RecordStockMovementInput,
  ): Promise<void> {
    await recordStockMovement(tx, input);
  }

  async findAll(
    viewer: AuthenticatedUser,
    organizationId?: string,
  ): Promise<StockMovementWithProduct[]> {
    const where: Prisma.StockMovementWhereInput = {
      organization: { organizationType: OrganizationType.SUBSIDIARY },
    };
    if (!isMainOrganizationUser(viewer)) {
      where.organizationId = viewer.organisationId;
    } else if (organizationId?.trim()) {
      where.organizationId = organizationId.trim();
    }
    return this.prisma.stockMovement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: movementInclude,
    });
  }

  async findOne(id: string, viewer: AuthenticatedUser) {
    const row = await this.prisma.stockMovement.findUnique({
      where: { id },
      include: movementInclude,
    });
    if (!row) {
      throw new NotFoundException('Mouvement de stock introuvable.');
    }
    assertOrganizationResourceAccess(viewer, row.organizationId);
    return row;
  }

  async recordAdjustment(
    organizationId: string,
    productId: string,
    quantityDelta: number,
    label: string | undefined,
    viewer: AuthenticatedUser,
  ): Promise<StockMovementWithProduct> {
    assertOrganizationResourceAccess(viewer, organizationId);
    if (quantityDelta === 0) {
      throw new NotFoundException('Variation nulle.');
    }
    const orgFilter = organizationListWhere(viewer);
    if (
      'organizationId' in orgFilter &&
      orgFilter.organizationId &&
      orgFilter.organizationId !== organizationId
    ) {
      throw new NotFoundException();
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.stock.update({
        where: {
          organizationId_productId: { organizationId, productId },
        },
        data: { quantity: { increment: quantityDelta } },
      });
      const movement = await tx.stockMovement.create({
        data: {
          organizationId,
          productId,
          quantityDelta,
          type: StockMovementType.ADJUSTMENT,
          referenceType: 'ManualAdjustment',
          label: label?.trim() || 'Ajustement manuel',
          recordedByUserId: viewer.sub,
        },
        include: movementInclude,
      });
      return movement;
    });
  }
}
