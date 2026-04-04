import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { BulletinPaieLigne, Prisma } from '../generated/prisma/client';

@Injectable()
export class BulletinPaieLigneService {
  constructor(private readonly prisma: PrismaService) {}

  async findByBulletinId(bulletinId: string): Promise<BulletinPaieLigne[]> {
    return this.prisma.bulletinPaieLigne.findMany({
      where: { bulletinId },
      orderBy: { ordre: 'asc' },
    });
  }

  async findOne(id: string): Promise<BulletinPaieLigne> {
    const row = await this.prisma.bulletinPaieLigne.findUnique({
      where: { id },
      include: { bulletin: true },
    });
    if (!row) {
      throw new NotFoundException('Ligne de bulletin introuvable');
    }
    return row;
  }

  async create(
    data: Prisma.BulletinPaieLigneCreateInput,
  ): Promise<BulletinPaieLigne> {
    return this.prisma.bulletinPaieLigne.create({ data });
  }

  async update(
    id: string,
    data: Prisma.BulletinPaieLigneUpdateInput,
  ): Promise<BulletinPaieLigne> {
    await this.findOne(id);
    return this.prisma.bulletinPaieLigne.update({ where: { id }, data });
  }

  async remove(id: string): Promise<BulletinPaieLigne> {
    const row = await this.findOne(id);
    await this.prisma.bulletinPaieLigne.delete({ where: { id } });
    return row;
  }
}
