import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Pointage, Prisma } from '../generated/prisma/client';

@Injectable()
export class PointageService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Pointage[]> {
    return this.prisma.pointage.findMany({
      orderBy: { entreeAt: 'desc' },
      include: {
        user: true,
        organization: true,
        planningShift: true,
        validatedByUser: true,
      },
    });
  }

  async findByUserId(userId: string, from?: Date, to?: Date): Promise<Pointage[]> {
    return this.prisma.pointage.findMany({
      where: {
        userId,
        ...(from || to
          ? {
              entreeAt: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      },
      orderBy: { entreeAt: 'desc' },
      include: { organization: true, planningShift: true },
    });
  }

  async findOne(id: string): Promise<Pointage> {
    const row = await this.prisma.pointage.findUnique({
      where: { id },
      include: {
        user: true,
        organization: true,
        planningShift: true,
        validatedByUser: true,
      },
    });
    if (!row) {
      throw new NotFoundException('Pointage introuvable');
    }
    return row;
  }

  async create(data: Prisma.PointageCreateInput): Promise<Pointage> {
    return this.prisma.pointage.create({
      data,
      include: { user: true, organization: true, planningShift: true },
    });
  }

  async update(id: string, data: Prisma.PointageUpdateInput): Promise<Pointage> {
    await this.findOne(id);
    return this.prisma.pointage.update({
      where: { id },
      data,
      include: { user: true, organization: true, validatedByUser: true },
    });
  }

  async remove(id: string): Promise<Pointage> {
    const row = await this.findOne(id);
    await this.prisma.pointage.delete({ where: { id } });
    return row;
  }
}
