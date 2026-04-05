import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import type { BulletinPaieLigne, Prisma } from '../generated/prisma/client';
import { assertBulletinInViewerScope } from './bulletin-access.util';

@Injectable()
export class BulletinPaieLigneService {
  constructor(private readonly prisma: PrismaService) {}

  async findByBulletinId(
    bulletinId: string,
    viewer: AuthenticatedUser,
  ): Promise<BulletinPaieLigne[]> {
    await assertBulletinInViewerScope(this.prisma, bulletinId, viewer);
    return this.prisma.bulletinPaieLigne.findMany({
      where: { bulletinId },
      orderBy: { ordre: 'asc' },
    });
  }

  async findOne(id: string, viewer: AuthenticatedUser): Promise<BulletinPaieLigne> {
    const row = await this.prisma.bulletinPaieLigne.findUnique({
      where: { id },
      include: { bulletin: true },
    });
    if (!row) {
      throw new NotFoundException('Ligne de bulletin introuvable');
    }
    await assertBulletinInViewerScope(this.prisma, row.bulletinId, viewer);
    return row;
  }

  async create(
    data: Prisma.BulletinPaieLigneCreateInput,
    viewer: AuthenticatedUser,
  ): Promise<BulletinPaieLigne> {
    const bulletinId = this.extractBulletinId(data);
    if (!bulletinId) {
      throw new BadRequestException('Bulletin manquant');
    }
    await assertBulletinInViewerScope(this.prisma, bulletinId, viewer);
    return this.prisma.bulletinPaieLigne.create({ data });
  }

  private extractBulletinId(
    data: Prisma.BulletinPaieLigneCreateInput,
  ): string {
    const b = data.bulletin;
    if (
      b &&
      typeof b === 'object' &&
      'connect' in b &&
      b.connect &&
      typeof b.connect === 'object' &&
      'id' in b.connect
    ) {
      return (b.connect as { id: string }).id;
    }
    return '';
  }

  async update(
    id: string,
    data: Prisma.BulletinPaieLigneUpdateInput,
    viewer: AuthenticatedUser,
  ): Promise<BulletinPaieLigne> {
    await this.findOne(id, viewer);
    return this.prisma.bulletinPaieLigne.update({ where: { id }, data });
  }

  async remove(id: string, viewer: AuthenticatedUser): Promise<BulletinPaieLigne> {
    const row = await this.findOne(id, viewer);
    await this.prisma.bulletinPaieLigne.delete({ where: { id } });
    return row;
  }
}
