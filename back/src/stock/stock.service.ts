import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Stock, Prisma } from '../generated/prisma/client';

@Injectable()
export class StockService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Stock[]> {
    return this.prisma.stock.findMany({
      orderBy: { updatedAt: 'desc' },
      include: { product: true, organization: true },
    });
  }

  async findOne(id: string): Promise<Stock> {
    const row = await this.prisma.stock.findUnique({
      where: { id },
      include: { product: true, organization: true },
    });
    if (!row) {
      throw new NotFoundException('Stock introuvable');
    }
    return row;
  }

  async findByOrganizationAndProduct(
    organizationId: string,
    productId: string,
  ): Promise<Stock | null> {
    return this.prisma.stock.findUnique({
      where: {
        organizationId_productId: { organizationId, productId },
      },
      include: { product: true, organization: true },
    });
  }

  async create(data: Prisma.StockCreateInput): Promise<Stock> {
    try {
      return await this.prisma.stock.create({ data });
    } catch {
      throw new BadRequestException(
        'Stock déjà existant pour ce couple organisation / produit',
      );
    }
  }

  async update(id: string, data: Prisma.StockUpdateInput): Promise<Stock> {
    await this.findOne(id);
    return this.prisma.stock.update({ where: { id }, data });
  }

  async upsertForOrgProduct(
    organizationId: string,
    productId: string,
    data: {
      quantity?: number;
      minQuantity?: number;
      maxQuantity?: number | null;
    },
  ): Promise<Stock> {
    return this.prisma.stock.upsert({
      where: {
        organizationId_productId: { organizationId, productId },
      },
      create: {
        organizationId,
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

  async remove(id: string): Promise<Stock> {
    const row = await this.findOne(id);
    await this.prisma.stock.delete({ where: { id } });
    return row;
  }
}
