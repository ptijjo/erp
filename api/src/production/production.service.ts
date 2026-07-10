import {
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
  assertMainOrgPoleDomain,
  POLE_DOMAIN,
} from '../auth/pole-scope';
import { PrismaService } from '../prisma/prisma.service';
import type { ProductionOrderStatus, Prisma } from '../generated/prisma/client';
import type {
  CreateProductionOrderDto,
  UpdateProductionOrderDto,
} from './dto/production.dto';

@Injectable()
export class ProductionService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(viewer: AuthenticatedUser) {
    const orgFilter = organizationListWhere(viewer);
    const where: Prisma.ProductionOrderWhereInput =
      'organizationId' in orgFilter && orgFilter.organizationId
        ? { organizationId: orgFilter.organizationId }
        : {};
    return this.prisma.productionOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { product: { select: { id: true, name: true } } },
    });
  }

  async findOne(id: string, viewer: AuthenticatedUser) {
    const row = await this.prisma.productionOrder.findUnique({
      where: { id },
      include: { product: { select: { id: true, name: true } } },
    });
    if (!row) {
      throw new NotFoundException('Ordre de production introuvable.');
    }
    assertOrganizationResourceAccess(viewer, row.organizationId);
    return row;
  }

  async create(dto: CreateProductionOrderDto, viewer: AuthenticatedUser) {
    if (isMainOrganizationUser(viewer)) {
      assertMainOrgPoleDomain(viewer, POLE_DOMAIN.PRODUCTION);
    }
    assertOrganizationResourceAccess(viewer, dto.organizationId);
    return this.prisma.productionOrder.create({
      data: {
        organizationId: dto.organizationId,
        title: dto.title.trim(),
        quantity: dto.quantity,
        productId: dto.productId ?? null,
        materialCost: dto.materialCost ?? null,
        laborCost: dto.laborCost ?? null,
        bomNotes: dto.bomNotes?.trim() || null,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        status: (dto.status as ProductionOrderStatus | undefined) ?? 'PLANNED',
        notes: dto.notes?.trim() || null,
      },
      include: { product: { select: { id: true, name: true } } },
    });
  }

  async update(
    id: string,
    dto: UpdateProductionOrderDto,
    viewer: AuthenticatedUser,
  ) {
    await this.findOne(id, viewer);
    if (isMainOrganizationUser(viewer)) {
      assertMainOrgPoleDomain(viewer, POLE_DOMAIN.PRODUCTION);
    }
    return this.prisma.productionOrder.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.quantity !== undefined ? { quantity: dto.quantity } : {}),
        ...(dto.productId !== undefined ? { productId: dto.productId } : {}),
        ...(dto.materialCost !== undefined ? { materialCost: dto.materialCost } : {}),
        ...(dto.laborCost !== undefined ? { laborCost: dto.laborCost } : {}),
        ...(dto.bomNotes !== undefined
          ? { bomNotes: dto.bomNotes?.trim() || null }
          : {}),
        ...(dto.scheduledAt !== undefined
          ? { scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null }
          : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes?.trim() || null } : {}),
        ...(dto.status === 'COMPLETED' ? { completedAt: new Date() } : {}),
      },
      include: { product: { select: { id: true, name: true } } },
    });
  }

  async remove(id: string, viewer: AuthenticatedUser) {
    await this.findOne(id, viewer);
    if (isMainOrganizationUser(viewer)) {
      assertMainOrgPoleDomain(viewer, POLE_DOMAIN.PRODUCTION);
    }
    return this.prisma.productionOrder.delete({ where: { id } });
  }
}
