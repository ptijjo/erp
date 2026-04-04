import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Absence, Prisma } from '../generated/prisma/client';

@Injectable()
export class AbsenceService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Absence[]> {
    return this.prisma.absence.findMany({
      orderBy: { debut: 'desc' },
      include: { user: true, organization: true },
    });
  }

  async findByUserId(userId: string): Promise<Absence[]> {
    return this.prisma.absence.findMany({
      where: { userId },
      orderBy: { debut: 'desc' },
      include: { organization: true },
    });
  }

  async findOne(id: string): Promise<Absence> {
    const row = await this.prisma.absence.findUnique({
      where: { id },
      include: { user: true, organization: true },
    });
    if (!row) {
      throw new NotFoundException('Absence introuvable');
    }
    return row;
  }

  async create(data: Prisma.AbsenceCreateInput): Promise<Absence> {
    return this.prisma.absence.create({
      data,
      include: { user: true, organization: true },
    });
  }

  async update(id: string, data: Prisma.AbsenceUpdateInput): Promise<Absence> {
    await this.findOne(id);
    return this.prisma.absence.update({
      where: { id },
      data,
      include: { user: true, organization: true },
    });
  }

  async remove(id: string): Promise<Absence> {
    const row = await this.findOne(id);
    await this.prisma.absence.delete({ where: { id } });
    return row;
  }
}
