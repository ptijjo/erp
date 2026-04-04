import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { PlanningShift, Prisma } from '../generated/prisma/client';

@Injectable()
export class PlanningShiftService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<PlanningShift[]> {
    return this.prisma.planningShift.findMany({
      orderBy: { startsAt: 'desc' },
      include: { user: true, organization: true },
    });
  }

  async findByOrganizationId(
    organizationId: string,
    from?: Date,
    to?: Date,
  ): Promise<PlanningShift[]> {
    return this.prisma.planningShift.findMany({
      where: {
        organizationId,
        ...(from || to
          ? {
              startsAt: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      },
      orderBy: { startsAt: 'asc' },
      include: { user: true },
    });
  }

  async findByUserId(userId: string, from?: Date, to?: Date): Promise<PlanningShift[]> {
    return this.prisma.planningShift.findMany({
      where: {
        userId,
        ...(from || to
          ? {
              startsAt: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      },
      orderBy: { startsAt: 'asc' },
      include: { organization: true },
    });
  }

  async findOne(id: string): Promise<PlanningShift> {
    const row = await this.prisma.planningShift.findUnique({
      where: { id },
      include: { user: true, organization: true, pointages: true },
    });
    if (!row) {
      throw new NotFoundException('Créneau introuvable');
    }
    return row;
  }

  async create(data: Prisma.PlanningShiftCreateInput): Promise<PlanningShift> {
    return this.prisma.planningShift.create({
      data,
      include: { user: true, organization: true },
    });
  }

  async update(
    id: string,
    data: Prisma.PlanningShiftUpdateInput,
  ): Promise<PlanningShift> {
    await this.findOne(id);
    return this.prisma.planningShift.update({
      where: { id },
      data,
      include: { user: true, organization: true },
    });
  }

  async remove(id: string): Promise<PlanningShift> {
    const row = await this.findOne(id);
    await this.prisma.planningShift.delete({ where: { id } });
    return row;
  }
}
