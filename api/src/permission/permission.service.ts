import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Permission, Prisma } from '../generated/prisma/client';

@Injectable()
export class PermissionService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Permission[]> {
    return this.prisma.permission.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: string): Promise<Permission> {
    const row = await this.prisma.permission.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException('Permission introuvable');
    }
    return row;
  }

  async create(data: Prisma.PermissionCreateInput): Promise<Permission> {
    const exists = await this.prisma.permission.findUnique({
      where: { name: data.name },
    });
    if (exists) {
      throw new BadRequestException('Une permission avec ce nom existe déjà');
    }
    return this.prisma.permission.create({ data });
  }

  async update(
    id: string,
    data: Prisma.PermissionUpdateInput,
  ): Promise<Permission> {
    await this.findOne(id);
    if (typeof data.name === 'string') {
      const dup = await this.prisma.permission.findFirst({
        where: { name: data.name, NOT: { id } },
      });
      if (dup) {
        throw new BadRequestException('Une permission avec ce nom existe déjà');
      }
    }
    return this.prisma.permission.update({ where: { id }, data });
  }

  async remove(id: string): Promise<Permission> {
    const row = await this.findOne(id);
    await this.prisma.permissionRole.deleteMany({ where: { permissionId: id } });
    await this.prisma.permission.delete({ where: { id } });
    return row;
  }
}
