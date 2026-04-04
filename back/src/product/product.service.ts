import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Product, Prisma } from '../generated/prisma/client';

@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Product[]> {
    return this.prisma.product.findMany({
      orderBy: { name: 'asc' },
      include: { category: true },
    });
  }

  async findOne(id: string): Promise<Product> {
    const row = await this.prisma.product.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!row) {
      throw new NotFoundException('Produit introuvable');
    }
    return row;
  }

  async findByQrCode(qrCode: string): Promise<Product> {
    const row = await this.prisma.product.findUnique({
      where: { qrCode },
      include: { category: true },
    });
    if (!row) {
      throw new NotFoundException('Produit introuvable pour ce QR code');
    }
    return row;
  }

  async create(data: Prisma.ProductCreateInput): Promise<Product> {
    const catId =
      typeof data.category === 'object' &&
      data.category !== null &&
      'connect' in data.category
        ? (data.category.connect as { id: string }).id
        : null;
    if (catId) {
      const c = await this.prisma.category.findUnique({ where: { id: catId } });
      if (!c) {
        throw new NotFoundException('Catégorie introuvable');
      }
    }
    try {
      return await this.prisma.product.create({ data });
    } catch {
      throw new BadRequestException(
        'Impossible de créer le produit (nom ou QR déjà utilisé ?)',
      );
    }
  }

  async update(id: string, data: Prisma.ProductUpdateInput): Promise<Product> {
    await this.findOne(id);
    try {
      return await this.prisma.product.update({ where: { id }, data });
    } catch {
      throw new BadRequestException(
        'Impossible de mettre à jour (contrainte d’unicité ?)',
      );
    }
  }

  async remove(id: string): Promise<Product> {
    const row = await this.findOne(id);
    await this.prisma.product.delete({ where: { id } });
    return row;
  }
}
