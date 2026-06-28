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
} from '../auth/organization-scope';
import { PrismaService } from '../prisma/prisma.service';
import {
  OrganizationType,
  StockMovementType,
  StockTransferStatus,
  type Prisma,
} from '../generated/prisma/client';
import type {
  CreateStockTransferDto,
  UpdateStockTransferStatusDto,
} from './dto/stock-transfer.dto';
import { recordStockMovement } from '../stock-movement/stock-movement.util';

const transferInclude = {
  product: { select: { id: true, name: true, qrCode: true } },
  fromOrganization: {
    select: { id: true, name: true, slug: true, organizationType: true },
  },
  toOrganization: {
    select: { id: true, name: true, slug: true, organizationType: true },
  },
  requestedBy: {
    select: { id: true, email: true, firstName: true, lastName: true },
  },
} as const;

@Injectable()
export class StockTransferService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    viewer: AuthenticatedUser,
    organizationId?: string,
  ) {
    const where: Prisma.StockTransferWhereInput = {};
    if (!isMainOrganizationUser(viewer)) {
      where.OR = [
        { fromOrganizationId: viewer.organisationId },
        { toOrganizationId: viewer.organisationId },
      ];
    } else if (organizationId?.trim()) {
      const orgId = organizationId.trim();
      where.OR = [{ fromOrganizationId: orgId }, { toOrganizationId: orgId }];
    }
    return this.prisma.stockTransfer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: transferInclude,
    });
  }

  async create(dto: CreateStockTransferDto, viewer: AuthenticatedUser) {
    if (dto.fromOrganizationId === dto.toOrganizationId) {
      throw new BadRequestException(
        'Les organisations source et destination doivent être différentes.',
      );
    }
    await this.assertSubsidiaryOrg(dto.fromOrganizationId);
    await this.assertSubsidiaryOrg(dto.toOrganizationId);

    if (!isMainOrganizationUser(viewer)) {
      if (dto.fromOrganizationId !== viewer.organisationId) {
        throw new ForbiddenException(
          'Seule l’organisation émettrice peut initier le transfert.',
        );
      }
    } else {
      assertOrganizationResourceAccess(viewer, dto.fromOrganizationId);
    }

    const stock = await this.prisma.stock.findUnique({
      where: {
        organizationId_productId: {
          organizationId: dto.fromOrganizationId,
          productId: dto.productId,
        },
      },
      select: { quantity: true },
    });
    if ((stock?.quantity ?? 0) < dto.quantity) {
      throw new BadRequestException('Stock insuffisant pour ce transfert.');
    }

    return this.prisma.stockTransfer.create({
      data: {
        fromOrganizationId: dto.fromOrganizationId,
        toOrganizationId: dto.toOrganizationId,
        productId: dto.productId,
        quantity: dto.quantity,
        note: dto.note?.trim() || null,
        requestedByUserId: viewer.sub,
      },
      include: transferInclude,
    });
  }

  async updateStatus(
    id: string,
    dto: UpdateStockTransferStatusDto,
    viewer: AuthenticatedUser,
  ) {
    const row = await this.prisma.stockTransfer.findUnique({
      where: { id },
      include: transferInclude,
    });
    if (!row) {
      throw new NotFoundException('Transfert introuvable.');
    }

    if (dto.status === 'CANCELLED') {
      return this.cancel(row, viewer);
    }
    if (dto.status === 'SHIPPED') {
      return this.ship(row, viewer);
    }
    return this.receive(row, viewer);
  }

  private async cancel(
    row: Prisma.StockTransferGetPayload<{ include: typeof transferInclude }>,
    viewer: AuthenticatedUser,
  ) {
    if (row.status !== StockTransferStatus.PENDING) {
      throw new BadRequestException('Seuls les transferts en attente peuvent être annulés.');
    }
    this.assertCanActOnTransfer(row, viewer, 'from');
    return this.prisma.stockTransfer.update({
      where: { id: row.id },
      data: { status: StockTransferStatus.CANCELLED },
      include: transferInclude,
    });
  }

  private async ship(
    row: Prisma.StockTransferGetPayload<{ include: typeof transferInclude }>,
    viewer: AuthenticatedUser,
  ) {
    if (row.status !== StockTransferStatus.PENDING) {
      throw new BadRequestException('Seuls les transferts en attente peuvent être expédiés.');
    }
    this.assertCanActOnTransfer(row, viewer, 'from');

    return this.prisma.$transaction(async (tx) => {
      const stock = await tx.stock.findUnique({
        where: {
          organizationId_productId: {
            organizationId: row.fromOrganizationId,
            productId: row.productId,
          },
        },
        select: { quantity: true },
      });
      if ((stock?.quantity ?? 0) < row.quantity) {
        throw new BadRequestException('Stock insuffisant à l’expédition.');
      }
      await tx.stock.update({
        where: {
          organizationId_productId: {
            organizationId: row.fromOrganizationId,
            productId: row.productId,
          },
        },
        data: { quantity: { decrement: row.quantity } },
      });
      await recordStockMovement(tx, {
        organizationId: row.fromOrganizationId,
        productId: row.productId,
        quantityDelta: -row.quantity,
        type: StockMovementType.TRANSFER_OUT,
        referenceType: 'StockTransfer',
        referenceId: row.id,
        recordedByUserId: viewer.sub,
      });
      return tx.stockTransfer.update({
        where: { id: row.id },
        data: { status: StockTransferStatus.SHIPPED, shippedAt: new Date() },
        include: transferInclude,
      });
    });
  }

  private async receive(
    row: Prisma.StockTransferGetPayload<{ include: typeof transferInclude }>,
    viewer: AuthenticatedUser,
  ) {
    if (row.status !== StockTransferStatus.SHIPPED) {
      throw new BadRequestException(
        'Seuls les transferts expédiés peuvent être réceptionnés.',
      );
    }
    this.assertCanActOnTransfer(row, viewer, 'to');

    return this.prisma.$transaction(async (tx) => {
      await tx.stock.upsert({
        where: {
          organizationId_productId: {
            organizationId: row.toOrganizationId,
            productId: row.productId,
          },
        },
        create: {
          organizationId: row.toOrganizationId,
          productId: row.productId,
          quantity: row.quantity,
          minQuantity: 0,
        },
        update: { quantity: { increment: row.quantity } },
      });
      await recordStockMovement(tx, {
        organizationId: row.toOrganizationId,
        productId: row.productId,
        quantityDelta: row.quantity,
        type: StockMovementType.TRANSFER_IN,
        referenceType: 'StockTransfer',
        referenceId: row.id,
        recordedByUserId: viewer.sub,
      });
      return tx.stockTransfer.update({
        where: { id: row.id },
        data: { status: StockTransferStatus.RECEIVED, receivedAt: new Date() },
        include: transferInclude,
      });
    });
  }

  private assertCanActOnTransfer(
    row: Prisma.StockTransferGetPayload<{ include: typeof transferInclude }>,
    viewer: AuthenticatedUser,
    side: 'from' | 'to',
  ): void {
    if (isMainOrganizationUser(viewer)) {
      return;
    }
    const orgId =
      side === 'from' ? row.fromOrganizationId : row.toOrganizationId;
    if (viewer.organisationId !== orgId) {
      throw new ForbiddenException();
    }
  }

  private async assertSubsidiaryOrg(organizationId: string): Promise<void> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { organizationType: true },
    });
    if (!org || org.organizationType !== OrganizationType.SUBSIDIARY) {
      throw new BadRequestException(
        'Les transferts inter-org ne concernent que les filiales.',
      );
    }
  }
}
