import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { BulletinPaie, Prisma } from '../generated/prisma/client';

@Injectable()
export class BulletinPaieService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<BulletinPaie[]> {
    return this.prisma.bulletinPaie.findMany({
      orderBy: [{ annee: 'desc' }, { mois: 'desc' }],
      include: {
        user: true,
        organization: true,
        lignes: { orderBy: { ordre: 'asc' } },
      },
    });
  }

  async findOne(id: string): Promise<BulletinPaie> {
    const row = await this.prisma.bulletinPaie.findUnique({
      where: { id },
      include: {
        user: true,
        organization: true,
        lignes: { orderBy: { ordre: 'asc' } },
      },
    });
    if (!row) {
      throw new NotFoundException('Bulletin de paie introuvable');
    }
    return row;
  }

  async findByPeriode(
    organizationId: string,
    annee: number,
    mois: number,
  ): Promise<BulletinPaie[]> {
    return this.prisma.bulletinPaie.findMany({
      where: { organizationId, annee, mois },
      include: { user: true, lignes: true },
    });
  }

  async create(data: Prisma.BulletinPaieCreateInput): Promise<BulletinPaie> {
    return this.prisma.bulletinPaie.create({
      data,
      include: { user: true, organization: true, lignes: true },
    });
  }

  async update(
    id: string,
    data: Prisma.BulletinPaieUpdateInput,
  ): Promise<BulletinPaie> {
    await this.findOne(id);
    return this.prisma.bulletinPaie.update({
      where: { id },
      data,
      include: { user: true, organization: true, lignes: true },
    });
  }

  async remove(id: string): Promise<BulletinPaie> {
    const row = await this.findOne(id);
    await this.prisma.bulletinPaie.delete({ where: { id } });
    return row;
  }
}
