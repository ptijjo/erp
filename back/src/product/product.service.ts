import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import {
  assertMainOrganizationOnly,
  isMainOrganizationUser,
} from '../auth/organization-scope';
import { PrismaService } from '../prisma/prisma.service';
import type { Product, Prisma } from '../generated/prisma/client';
import { productCatalogWhereForViewer } from './product-subsidiary-scope.util';

@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(viewer: AuthenticatedUser): Promise<Product[]> {
    const where = await productCatalogWhereForViewer(this.prisma, viewer);
    return this.prisma.product.findMany({
      where,
      orderBy: { name: 'asc' },
      include: { category: true },
    });
  }

  async findOne(id: string, viewer: AuthenticatedUser): Promise<Product> {
    const row = await this.prisma.product.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!row) {
      throw new NotFoundException('Produit introuvable');
    }
    if (isMainOrganizationUser(viewer)) {
      return row;
    }
    const filter = await productCatalogWhereForViewer(this.prisma, viewer);
    const ok = await this.prisma.product.count({
      where: { AND: [{ id }, filter] },
    });
    if (ok === 0) {
      throw new ForbiddenException(
        'Ce produit n’est pas disponible pour votre organisation.',
      );
    }
    return row;
  }

  async findByQrCode(
    qrCode: string,
    viewer: AuthenticatedUser,
  ): Promise<Product> {
    const row = await this.prisma.product.findUnique({
      where: { qrCode },
      include: { category: true },
    });
    if (!row) {
      throw new NotFoundException('Produit introuvable pour ce QR code');
    }
    if (isMainOrganizationUser(viewer)) {
      return row;
    }
    const filter = await productCatalogWhereForViewer(this.prisma, viewer);
    const ok = await this.prisma.product.count({
      where: { AND: [{ id: row.id }, filter] },
    });
    if (ok === 0) {
      throw new NotFoundException('Produit introuvable pour ce QR code');
    }
    return row;
  }

  async create(
    data: Prisma.ProductCreateInput,
    viewer: AuthenticatedUser,
  ): Promise<Product> {
    assertMainOrganizationOnly(viewer);
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
      return await this.prisma.product.create({
        data,
        include: { category: true },
      });
    } catch {
      throw new BadRequestException(
        'Impossible de créer le produit (nom ou QR déjà utilisé ?)',
      );
    }
  }

  async update(
    id: string,
    data: Prisma.ProductUpdateInput,
    viewer: AuthenticatedUser,
  ): Promise<Product> {
    assertMainOrganizationOnly(viewer);
    await this.findOne(id, viewer);
    try {
      return await this.prisma.product.update({
        where: { id },
        data,
        include: { category: true },
      });
    } catch {
      throw new BadRequestException(
        'Impossible de mettre à jour (contrainte d’unicité ?)',
      );
    }
  }

  async remove(id: string, viewer: AuthenticatedUser): Promise<Product> {
    assertMainOrganizationOnly(viewer);
    const row = await this.findOne(id, viewer);
    await this.prisma.product.delete({ where: { id } });
    return row;
  }
}
