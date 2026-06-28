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
import { assertProductUsableForOrganization } from '../product/product-subsidiary-scope.util';
import { PrismaService } from '../prisma/prisma.service';
import { BudgetStockLinkService } from '../budget/budget-stock-link.service';
import { OrganizationType, StockMovementType, StockOrderStatus } from '../generated/prisma/client';
import type { Prisma, StockOrder } from '../generated/prisma/client';
import { recordStockMovement } from '../stock-movement/stock-movement.util';
import {
  type BudgetLinkResult,
  type StockOrderResponseDto,
  toStockOrderResponse,
} from './stock-order.mapper';

type OrderRow = StockOrder & {
  product: { id: string };
  subsidiaryOrganization: {
    id: string;
    organizationType: (typeof OrganizationType)[keyof typeof OrganizationType];
  };
};

@Injectable()
export class StockOrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly budgetStockLink: BudgetStockLinkService,
  ) {}

  private readonly orderInclude = {
    product: {
      include: {
        category: true,
        productSuppliers: { include: { supplier: true } },
      },
    },
    subsidiaryOrganization: true,
    supplier: true,
    requestedBy: { select: { id: true, email: true } },
    budgetExpense: { select: { id: true, amount: true } },
  } as const;

  /**
   * Liste des commandes : filiale = la sienne uniquement (paramètre ignoré).
   * Maison mère = toutes les filiales ; `subsidiaryOrganizationId` restreint à une filiale (doit être `SUBSIDIARY`).
   */
  async findAll(
    viewer: AuthenticatedUser,
    subsidiaryOrganizationId?: string | undefined,
  ): Promise<StockOrderResponseDto[]> {
    if (!isMainOrganizationUser(viewer)) {
      const rows = await this.prisma.stockOrder.findMany({
        where: { subsidiaryOrganizationId: viewer.organisationId },
        orderBy: { createdAt: 'desc' },
        include: this.orderInclude,
      });
      return rows.map((row) => toStockOrderResponse(row));
    }

    const trimmedFilter = subsidiaryOrganizationId?.trim() ?? '';
    let where: Prisma.StockOrderWhereInput = {};

    if (trimmedFilter !== '') {
      const org = await this.prisma.organization.findUnique({
        where: { id: trimmedFilter },
        select: { organizationType: true },
      });
      if (
        !org ||
        org.organizationType !== OrganizationType.SUBSIDIARY
      ) {
        throw new BadRequestException(
          'Filtre invalide : identifiant de filiale inconnu ou non autorisé.',
        );
      }
      where = { subsidiaryOrganizationId: trimmedFilter };
    }

    const rows = await this.prisma.stockOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: this.orderInclude,
    });
    return rows.map((row) => toStockOrderResponse(row));
  }

  async create(
    dto: {
      productId: string;
      supplierId: string;
      quantity: number;
      note?: string;
    },
    viewer: AuthenticatedUser,
  ): Promise<StockOrderResponseDto> {
    if (isMainOrganizationUser(viewer)) {
      throw new ForbiddenException(
        'Les commandes de réapprovisionnement sont créées par les filiales.',
      );
    }

    const org = await this.prisma.organization.findUnique({
      where: { id: viewer.organisationId },
      select: { organizationType: true },
    });
    if (!org || org.organizationType !== OrganizationType.SUBSIDIARY) {
      throw new BadRequestException(
        'Seules les filiales peuvent passer une commande.',
      );
    }

    await assertProductUsableForOrganization(
      this.prisma,
      dto.productId,
      viewer.organisationId,
    );

    const link = await this.prisma.productSupplier.findUnique({
      where: {
        productId_supplierId: {
          productId: dto.productId,
          supplierId: dto.supplierId,
        },
      },
    });
    if (!link) {
      throw new BadRequestException(
        'Ce fournisseur n’est pas associé à ce produit. Choisissez un fournisseur parmi ceux configurés par la maison mère.',
      );
    }

    const supplier = await this.prisma.supplier.findUnique({
      where: { id: dto.supplierId },
      select: { price: true },
    });
    if (!supplier) {
      throw new BadRequestException('Fournisseur introuvable.');
    }

    const row = await this.prisma.stockOrder.create({
      data: {
        subsidiaryOrganizationId: viewer.organisationId,
        productId: dto.productId,
        supplierId: dto.supplierId,
        unitPrice: supplier.price,
        quantity: dto.quantity,
        note: dto.note?.trim() || undefined,
        requestedByUserId: viewer.sub,
      },
      include: this.orderInclude,
    });
    return toStockOrderResponse(row);
  }

  async updateStatus(
    id: string,
    nextStatus: StockOrderStatus,
    viewer: AuthenticatedUser,
  ): Promise<StockOrderResponseDto> {
    const row = (await this.prisma.stockOrder.findUnique({
      where: { id },
      include: {
        product: true,
        subsidiaryOrganization: true,
      },
    })) as OrderRow | null;

    if (!row) {
      throw new NotFoundException('Commande introuvable');
    }

    assertOrganizationResourceAccess(viewer, row.subsidiaryOrganizationId);

    if (isMainOrganizationUser(viewer)) {
      return this.applyMainStatusTransition(row, nextStatus);
    }

    return this.applySubsidiaryStatusTransition(row, nextStatus, viewer);
  }

  /** Maison mère : refuser une commande en attente (pas de confirmation de réception ici). */
  private async applyMainStatusTransition(
    row: OrderRow,
    nextStatus: StockOrderStatus,
  ): Promise<StockOrderResponseDto> {
    if (
      row.subsidiaryOrganization.organizationType !== OrganizationType.SUBSIDIARY
    ) {
      throw new BadRequestException('Organisation incohérente.');
    }

    if (row.status !== StockOrderStatus.PENDING) {
      throw new BadRequestException(
        'Seules les commandes en attente peuvent être modifiées.',
      );
    }

    if (nextStatus !== StockOrderStatus.CANCELLED) {
      throw new BadRequestException(
        'La maison mère peut uniquement refuser une commande en attente.',
      );
    }

    const updated = await this.prisma.stockOrder.update({
      where: { id: row.id },
      data: { status: StockOrderStatus.CANCELLED },
      include: this.orderInclude,
    });
    return toStockOrderResponse(updated);
  }

  /** Filiale : confirmer la réception (incrémente le stock) ou annuler tant que la commande est en attente. */
  private async applySubsidiaryStatusTransition(
    row: OrderRow,
    nextStatus: StockOrderStatus,
    viewer: AuthenticatedUser,
  ): Promise<StockOrderResponseDto> {
    if (row.subsidiaryOrganizationId !== viewer.organisationId) {
      throw new ForbiddenException();
    }

    if (row.status !== StockOrderStatus.PENDING) {
      throw new BadRequestException(
        'Seules les commandes en attente peuvent être modifiées.',
      );
    }

    if (nextStatus === StockOrderStatus.CANCELLED) {
      const updated = await this.prisma.stockOrder.update({
        where: { id: row.id },
        data: { status: StockOrderStatus.CANCELLED },
        include: this.orderInclude,
      });
      return toStockOrderResponse(updated);
    }

    if (nextStatus === StockOrderStatus.CONFIRMED) {
      return this.prisma.$transaction(async (tx) => {
        await tx.stockOrder.update({
          where: { id: row.id },
          data: { status: StockOrderStatus.CONFIRMED },
        });

        await tx.stock.upsert({
          where: {
            organizationId_productId: {
              organizationId: row.subsidiaryOrganizationId,
              productId: row.productId,
            },
          },
          create: {
            organizationId: row.subsidiaryOrganizationId,
            productId: row.productId,
            quantity: row.quantity,
            minQuantity: 0,
          },
          update: {
            quantity: { increment: row.quantity },
          },
        });

        await recordStockMovement(tx, {
          organizationId: row.subsidiaryOrganizationId,
          productId: row.productId,
          quantityDelta: row.quantity,
          type: StockMovementType.RECEIPT_STOCK_ORDER,
          referenceType: 'StockOrder',
          referenceId: row.id,
          recordedByUserId: viewer.sub,
        });

        const fullOrder = await tx.stockOrder.findUniqueOrThrow({
          where: { id: row.id },
          select: {
            id: true,
            subsidiaryOrganizationId: true,
            quantity: true,
            unitPrice: true,
            createdAt: true,
            requestedByUserId: true,
            product: { select: { name: true } },
          },
        });

        const linkResult: BudgetLinkResult =
          await this.budgetStockLink.recordExpenseForConfirmedStockOrder(
            fullOrder,
            tx,
          );

        const confirmed = await tx.stockOrder.findUniqueOrThrow({
          where: { id: row.id },
          include: this.orderInclude,
        });
        return toStockOrderResponse(confirmed, linkResult);
      });
    }

    throw new BadRequestException('Statut invalide pour la filiale.');
  }
}
