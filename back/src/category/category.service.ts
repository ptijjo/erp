import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Category, Prisma } from '../generated/prisma/client';

@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Category[]> {
    return this.prisma.category.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: string): Promise<Category> {
    const row = await this.prisma.category.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException('Catégorie introuvable');
    }
    return row;
  }

  async create(data: Prisma.CategoryCreateInput): Promise<Category> {
    const parentConnect = data.parent as
      | { connect?: { id: string } }
      | undefined;
    if (parentConnect?.connect?.id) {
      await this.findOne(parentConnect.connect.id);
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
  ): Promise<Category> {
    await this.findOne(id);
    try {
      return await this.prisma.category.update({ where: { id }, data });
    } catch {
      throw new BadRequestException(
        'Impossible de mettre à jour (contrainte d’unicité ?)',
      );
    }
  }

  async remove(id: string): Promise<Category> {
    const row = await this.findOne(id);
    await this.prisma.category.delete({ where: { id } });
    return row;
  }
}
