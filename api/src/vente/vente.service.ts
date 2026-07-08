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
import {
  assertProductUsableForOrganization,
  assertSubsidiaryHasSalesCatalog,
} from '../product/product-subsidiary-scope.util';
import { PrismaService } from '../prisma/prisma.service';
import {
  OrganizationType,
  VenteStatut,
  StockMovementType,
  SessionCaisseStatut,
  NotificationType,
  type Prisma,
} from '../generated/prisma/client';
import type { AddVenteLineDto, ConfirmVenteDto, ReturnVenteDto } from './dto/vente.dto';
import type {
  ConfirmVenteResultDto,
  LowStockAlertDto,
  ScanProductForSaleDto,
  VenteWithDetails,
} from './vente.types';
import { venteInclude } from './vente.types';
import { SessionCaisseService } from '../session-caisse/session-caisse.service';
import { AccountingPeriodService } from '../treasury/accounting-period.service';
import { NotificationService } from '../notification/notification.service';
import { recordStockMovement } from '../stock-movement/stock-movement.util';

@Injectable()
export class VenteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionCaisseService: SessionCaisseService,
    private readonly accountingPeriodService: AccountingPeriodService,
    private readonly notificationService: NotificationService,
  ) {}

  async create(viewer: AuthenticatedUser): Promise<VenteWithDetails> {
    const orgId = this.requireSubsidiaryViewer(viewer);
    await assertSubsidiaryHasSalesCatalog(this.prisma, orgId);
    await this.accountingPeriodService.assertPeriodOpenForDate(
      orgId,
      new Date(),
    );
    const session =
      await this.sessionCaisseService.requireOpenSessionForViewer(viewer);

    const row = await this.prisma.vente.create({
      data: {
        organizationId: orgId,
        userId: viewer.sub,
        sessionCaisseId: session.id,
        status: VenteStatut.DRAFT,
      },
      include: venteInclude,
    });
    return row;
  }

  async findAll(viewer: AuthenticatedUser): Promise<VenteWithDetails[]> {
    const where = this.listWhere(viewer);
    return this.prisma.vente.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: venteInclude,
      take: 100,
    });
  }

  async findOne(id: string, viewer: AuthenticatedUser): Promise<VenteWithDetails> {
    const row = await this.getVenteOrThrow(id);
    assertOrganizationResourceAccess(viewer, row.organizationId);
    return this.prisma.vente.findUniqueOrThrow({
      where: { id },
      include: venteInclude,
    });
  }

  async scanProduct(
    qrCode: string,
    viewer: AuthenticatedUser,
  ): Promise<ScanProductForSaleDto> {
    const orgId = this.requireSubsidiaryViewer(viewer);
    const trimmed = qrCode.trim();
    if (!trimmed) {
      throw new BadRequestException('QR code vide.');
    }

    const product = await this.prisma.product.findUnique({
      where: { qrCode: trimmed },
      select: {
        id: true,
        name: true,
        qrCode: true,
        price: true,
        deletedAt: true,
        category: { select: { id: true, name: true } },
      },
    });
    if (!product || product.deletedAt) {
      throw new NotFoundException('Produit introuvable pour ce QR code.');
    }

    await assertProductUsableForOrganization(
      this.prisma,
      product.id,
      orgId,
    );

    const stock = await this.prisma.stock.findUnique({
      where: {
        organizationId_productId: {
          organizationId: orgId,
          productId: product.id,
        },
      },
      select: { quantity: true, minQuantity: true, maxQuantity: true },
    });

    const availableQuantity = stock?.quantity ?? 0;

    return {
      product: {
        id: product.id,
        name: product.name,
        qrCode: product.qrCode,
        price: Number(product.price),
        category: product.category,
      },
      stock: stock
        ? {
            quantity: stock.quantity,
            minQuantity: stock.minQuantity,
            maxQuantity: stock.maxQuantity,
          }
        : null,
      availableQuantity,
      canSell: availableQuantity > 0,
    };
  }

  async addLine(
    venteId: string,
    dto: AddVenteLineDto,
    viewer: AuthenticatedUser,
  ): Promise<VenteWithDetails> {
    const vente = await this.getDraftVente(venteId, viewer);
    const orgId = vente.organizationId;

    const productId = await this.resolveProductId(dto, orgId);

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, price: true, deletedAt: true },
    });
    if (!product || product.deletedAt) {
      throw new NotFoundException('Produit introuvable.');
    }

    await assertProductUsableForOrganization(this.prisma, productId, orgId);

    const existing = await this.prisma.venteLine.findUnique({
      where: {
        venteId_productId: { venteId, productId },
      },
    });

    if (existing) {
      await this.prisma.venteLine.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + dto.quantity },
      });
    } else {
      await this.prisma.venteLine.create({
        data: {
          venteId,
          productId,
          quantity: dto.quantity,
          unitPrice: product.price,
        },
      });
    }

    await this.recalculateTotal(venteId);
    return this.findOne(venteId, viewer);
  }

  async updateLine(
    venteId: string,
    lineId: string,
    quantity: number,
    viewer: AuthenticatedUser,
  ): Promise<VenteWithDetails> {
    await this.getDraftVente(venteId, viewer);
    const line = await this.prisma.venteLine.findFirst({
      where: { id: lineId, venteId },
    });
    if (!line) {
      throw new NotFoundException('Ligne de vente introuvable.');
    }

    await this.prisma.venteLine.update({
      where: { id: lineId },
      data: { quantity },
    });
    await this.recalculateTotal(venteId);
    return this.findOne(venteId, viewer);
  }

  async removeLine(
    venteId: string,
    lineId: string,
    viewer: AuthenticatedUser,
  ): Promise<VenteWithDetails> {
    await this.getDraftVente(venteId, viewer);
    const line = await this.prisma.venteLine.findFirst({
      where: { id: lineId, venteId },
    });
    if (!line) {
      throw new NotFoundException('Ligne de vente introuvable.');
    }

    await this.prisma.venteLine.delete({ where: { id: lineId } });
    await this.recalculateTotal(venteId);
    return this.findOne(venteId, viewer);
  }

  async confirm(
    venteId: string,
    dto: ConfirmVenteDto,
    viewer: AuthenticatedUser,
  ): Promise<ConfirmVenteResultDto> {
    const vente = await this.getDraftVente(venteId, viewer);
    const orgId = vente.organizationId;

    if (vente.lines.length === 0) {
      throw new BadRequestException(
        'Impossible de valider une vente sans ligne.',
      );
    }

    const total = Number(vente.totalAmount);
    const paid = dto.paiements.reduce((s, p) => s + p.amount, 0);
    if (Math.round(paid) !== Math.round(total)) {
      throw new BadRequestException(
        `Le total des paiements (${paid} FCFA) doit être égal au montant de la vente (${total} FCFA).`,
      );
    }

    for (const line of vente.lines) {
      const stock = await this.prisma.stock.findUnique({
        where: {
          organizationId_productId: {
            organizationId: orgId,
            productId: line.productId,
          },
        },
        select: { quantity: true },
      });
      const available = stock?.quantity ?? 0;
      if (available < line.quantity) {
        throw new BadRequestException(
          `Stock insuffisant pour « ${line.product.name} » : ${available} disponible(s), ${line.quantity} demandé(s).`,
        );
      }
    }

    if (!vente.sessionCaisseId) {
      throw new BadRequestException(
        'Cette vente n’est pas rattachée à une session de caisse.',
      );
    }

    if (!isMainOrganizationUser(viewer)) {
      await this.sessionCaisseService.assertVenteBelongsToOpenSession(
        venteId,
        viewer,
      );
    }

    await this.accountingPeriodService.assertPeriodOpenForDate(
      orgId,
      new Date(),
    );

    const lowStockAlerts: LowStockAlertDto[] = [];

    const confirmed = await this.prisma.$transaction(async (tx) => {
      const session = await tx.sessionCaisse.findUnique({
        where: { id: vente.sessionCaisseId! },
        select: { statut: true },
      });
      if (!session || session.statut !== SessionCaisseStatut.OUVERTE) {
        throw new BadRequestException(
          'La session de caisse n’est plus ouverte.',
        );
      }

      const ticketAgg = await tx.vente.aggregate({
        where: {
          sessionCaisseId: vente.sessionCaisseId!,
          status: VenteStatut.CONFIRMED,
        },
        _max: { numeroTicket: true },
      });
      const numeroTicket = (ticketAgg._max.numeroTicket ?? 0) + 1;

      for (const line of vente.lines) {
        const updated = await tx.stock.update({
          where: {
            organizationId_productId: {
              organizationId: orgId,
              productId: line.productId,
            },
          },
          data: { quantity: { decrement: line.quantity } },
          select: {
            quantity: true,
            minQuantity: true,
            product: { select: { id: true, name: true } },
          },
        });

        if (updated.quantity <= updated.minQuantity) {
          lowStockAlerts.push({
            productId: updated.product.id,
            productName: updated.product.name,
            quantity: updated.quantity,
            minQuantity: updated.minQuantity,
          });
        }

        await recordStockMovement(tx, {
          organizationId: orgId,
          productId: line.productId,
          quantityDelta: -line.quantity,
          type: StockMovementType.SALE,
          referenceType: 'Vente',
          referenceId: venteId,
          recordedByUserId: viewer.sub,
        });
      }

      await tx.ventePaiement.deleteMany({ where: { venteId } });
      await tx.ventePaiement.createMany({
        data: dto.paiements.map((p) => ({
          venteId,
          modePaiement: p.modePaiement,
          amount: p.amount,
        })),
      });

      await tx.vente.update({
        where: { id: venteId },
        data: { status: VenteStatut.CONFIRMED, numeroTicket },
      });

      return tx.vente.findUniqueOrThrow({
        where: { id: venteId },
        include: venteInclude,
      });
    });

    if (lowStockAlerts.length > 0) {
      const names = lowStockAlerts.map((a) => a.productName).join(', ');
      void this.notificationService.notifyUsersWithPermission(
        orgId,
        'read:Stock',
        {
          type: NotificationType.STOCK_LOW_AFTER_SALE,
          title: 'Stock bas après vente',
          body: `Stock sous le seuil pour : ${names}.`,
          metadata: { venteId, alerts: lowStockAlerts },
        },
      );
    }

    return { ...confirmed, lowStockAlerts };
  }

  async cancel(
    venteId: string,
    viewer: AuthenticatedUser,
  ): Promise<VenteWithDetails> {
    const vente = await this.getDraftVente(venteId, viewer);
    return this.prisma.vente.update({
      where: { id: vente.id },
      data: { status: VenteStatut.CANCELLED },
      include: venteInclude,
    });
  }

  /** Retour partiel ou total sur une vente confirmée — réintègre le stock. */
  async returnSale(
    venteId: string,
    dto: ReturnVenteDto,
    viewer: AuthenticatedUser,
  ): Promise<{ returnId: string; totalAmount: number }> {
    const vente = await this.findOne(venteId, viewer);
    if (vente.status !== VenteStatut.CONFIRMED) {
      throw new BadRequestException(
        'Seules les ventes confirmées peuvent faire l’objet d’un retour.',
      );
    }
    const orgId = vente.organizationId;
    this.requireSubsidiaryViewer(viewer);
    assertOrganizationResourceAccess(viewer, orgId);

    await this.accountingPeriodService.assertPeriodOpenForDate(
      orgId,
      new Date(),
    );

    let totalAmount = 0;
    for (const line of dto.lines) {
      const original = vente.lines.find((l) => l.productId === line.productId);
      if (!original) {
        throw new BadRequestException(
          `Produit absent de la vente d’origine : ${line.productId}`,
        );
      }
      if (line.quantity > original.quantity) {
        throw new BadRequestException(
          `Quantité retournée trop élevée pour « ${original.product.name} ».`,
        );
      }
      totalAmount += Number(original.unitPrice) * line.quantity;
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const created = await tx.venteReturn.create({
        data: {
          organizationId: orgId,
          venteId,
          reason: dto.reason?.trim() || null,
          totalAmount,
          recordedByUserId: viewer.sub,
          lines: {
            create: dto.lines.map((line) => {
              const original = vente.lines.find(
                (l) => l.productId === line.productId,
              )!;
              return {
                productId: line.productId,
                quantity: line.quantity,
                unitPrice: original.unitPrice,
              };
            }),
          },
        },
      });

      for (const line of dto.lines) {
        await tx.stock.upsert({
          where: {
            organizationId_productId: {
              organizationId: orgId,
              productId: line.productId,
            },
          },
          create: {
            organizationId: orgId,
            productId: line.productId,
            quantity: line.quantity,
            minQuantity: 0,
          },
          update: { quantity: { increment: line.quantity } },
        });
        await recordStockMovement(tx, {
          organizationId: orgId,
          productId: line.productId,
          quantityDelta: line.quantity,
          type: StockMovementType.SALE_RETURN,
          referenceType: 'VenteReturn',
          referenceId: created.id,
          label: dto.reason?.trim() || null,
          recordedByUserId: viewer.sub,
        });
      }

      return created;
    });

    return { returnId: result.id, totalAmount: Number(result.totalAmount) };
  }

  private requireSubsidiaryViewer(viewer: AuthenticatedUser): string {
    if (isMainOrganizationUser(viewer)) {
      throw new ForbiddenException(
        'Les ventes en caisse sont enregistrées par les filiales.',
      );
    }
    return viewer.organisationId;
  }

  private listWhere(viewer: AuthenticatedUser): Prisma.VenteWhereInput {
    if (isMainOrganizationUser(viewer)) {
      return {
        organization: { organizationType: OrganizationType.SUBSIDIARY },
      };
    }
    return { organizationId: viewer.organisationId };
  }

  private async getVenteOrThrow(id: string) {
    const row = await this.prisma.vente.findUnique({
      where: { id },
      include: { lines: { include: { product: true } } },
    });
    if (!row) {
      throw new NotFoundException('Vente introuvable.');
    }
    return row;
  }

  private async getDraftVente(
    venteId: string,
    viewer: AuthenticatedUser,
  ): Promise<VenteWithDetails> {
    const row = await this.findOne(venteId, viewer);
    if (row.status !== VenteStatut.DRAFT) {
      throw new BadRequestException(
        'Seules les ventes en brouillon peuvent être modifiées.',
      );
    }
    if (!isMainOrganizationUser(viewer) && row.organizationId !== viewer.organisationId) {
      throw new ForbiddenException();
    }
    if (!isMainOrganizationUser(viewer)) {
      await this.sessionCaisseService.assertVenteBelongsToOpenSession(
        venteId,
        viewer,
      );
    }
    return row;
  }

  private async resolveProductId(
    dto: AddVenteLineDto,
    organizationId: string,
  ): Promise<string> {
    if (dto.productId && dto.qrCode) {
      throw new BadRequestException(
        'Indiquez soit productId soit qrCode, pas les deux.',
      );
    }
    if (dto.productId) {
      return dto.productId;
    }
    if (dto.qrCode?.trim()) {
      const product = await this.prisma.product.findUnique({
        where: { qrCode: dto.qrCode.trim() },
        select: { id: true, deletedAt: true },
      });
      if (!product || product.deletedAt) {
        throw new NotFoundException('Produit introuvable pour ce QR code.');
      }
      return product.id;
    }
    throw new BadRequestException('productId ou qrCode requis.');
  }

  private async recalculateTotal(venteId: string): Promise<void> {
    const lines = await this.prisma.venteLine.findMany({
      where: { venteId },
      select: { quantity: true, unitPrice: true },
    });
    const total = lines.reduce(
      (s, l) => s + Number(l.unitPrice) * l.quantity,
      0,
    );
    await this.prisma.vente.update({
      where: { id: venteId },
      data: { totalAmount: total },
    });
  }
}
