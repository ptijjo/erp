import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { assertMainOrganizationOnly } from '../auth/organization-scope';
import { PrismaService } from '../prisma/prisma.service';
import type { Supplier } from '../generated/prisma/client';
import type { CreateSupplierDto, UpdateSupplierDto } from './dto/supplier.dto';

@Injectable()
export class SupplierService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(viewer: AuthenticatedUser): Promise<Supplier[]> {
    assertMainOrganizationOnly(viewer);
    return this.prisma.supplier.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async create(
    dto: CreateSupplierDto,
    viewer: AuthenticatedUser,
  ): Promise<Supplier> {
    assertMainOrganizationOnly(viewer);
    return this.prisma.supplier.create({
      data: {
        name: dto.name.trim(),
        price: dto.price,
        email: dto.email?.trim() || null,
        phone: dto.phone?.trim() || null,
        note: dto.note?.trim() || null,
        createdByOrganization: {
          connect: { id: viewer.organisationId },
        },
      },
    });
  }

  async update(
    id: string,
    dto: UpdateSupplierDto,
    viewer: AuthenticatedUser,
  ): Promise<Supplier> {
    assertMainOrganizationOnly(viewer);
    await this.ensureExists(id);
    try {
      return await this.prisma.supplier.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.price !== undefined ? { price: dto.price } : {}),
          ...(dto.email !== undefined
            ? { email: dto.email?.trim() || null }
            : {}),
          ...(dto.phone !== undefined
            ? { phone: dto.phone?.trim() || null }
            : {}),
          ...(dto.note !== undefined ? { note: dto.note?.trim() || null } : {}),
        },
      });
    } catch {
      throw new BadRequestException('Impossible de mettre à jour le fournisseur.');
    }
  }

  async remove(id: string, viewer: AuthenticatedUser): Promise<Supplier> {
    assertMainOrganizationOnly(viewer);
    const row = await this.ensureExists(id);
    try {
      await this.prisma.supplier.delete({ where: { id } });
      return row;
    } catch {
      throw new BadRequestException(
        'Impossible de supprimer : le fournisseur est encore utilisé.',
      );
    }
  }

  private async ensureExists(id: string): Promise<Supplier> {
    const row = await this.prisma.supplier.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException('Fournisseur introuvable');
    }
    return row;
  }
}
