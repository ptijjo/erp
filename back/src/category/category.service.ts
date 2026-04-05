import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { assertMainOrganizationOnly } from '../auth/organization-scope';
import { isMainOrganizationUser } from '../auth/organization-scope';
import { subsidiaryVisibleCategoryIdsForOrganization } from '../product/product-subsidiary-scope.util';
import { PrismaService } from '../prisma/prisma.service';
import type { Category, Prisma } from '../generated/prisma/client';

@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(viewer: AuthenticatedUser): Promise<Category[]> {
    if (isMainOrganizationUser(viewer)) {
      return this.prisma.category.findMany({ orderBy: { name: 'asc' } });
    }
    const ids = await subsidiaryVisibleCategoryIdsForOrganization(
      this.prisma,
      viewer.organisationId,
    );
    if (ids.size === 0) {
      return [];
    }
    return this.prisma.category.findMany({
      where: { id: { in: [...ids] } },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, viewer: AuthenticatedUser): Promise<Category> {
    const row = await this.prisma.category.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException('Catégorie introuvable');
    }
    if (!isMainOrganizationUser(viewer)) {
      const allowed = await subsidiaryVisibleCategoryIdsForOrganization(
        this.prisma,
        viewer.organisationId,
      );
      if (!allowed.has(id)) {
        throw new ForbiddenException(
          'Cette catégorie n’est pas liée au catalogue de votre filiale.',
        );
      }
    }
    return row;
  }

  async create(
    data: Prisma.CategoryCreateInput,
    viewer: AuthenticatedUser,
  ): Promise<Category> {
    assertMainOrganizationOnly(viewer);
    const parentConnect = data.parent as
      | { connect?: { id: string } }
      | undefined;
    if (parentConnect?.connect?.id) {
      await this.findOne(parentConnect.connect.id, viewer);
    }
    try {
      return await this.prisma.category.create({ data });
    } catch {
      throw new BadRequestException(
        'Impossible de créer la catégorie (nom déjà utilisé pour ce parent ?)',
      );
    }
  }

  async update(
    id: string,
    data: Prisma.CategoryUpdateInput,
    viewer: AuthenticatedUser,
  ): Promise<Category> {
    assertMainOrganizationOnly(viewer);
    await this.findOne(id, viewer);
    try {
      return await this.prisma.category.update({ where: { id }, data });
    } catch {
      throw new BadRequestException(
        'Impossible de mettre à jour (contrainte d’unicité ?)',
      );
    }
  }

  async remove(id: string, viewer: AuthenticatedUser): Promise<Category> {
    assertMainOrganizationOnly(viewer);
    const row = await this.findOne(id, viewer);
    await this.prisma.category.delete({ where: { id } });
    return row;
  }
}
