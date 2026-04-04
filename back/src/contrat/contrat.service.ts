import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Contrat, Prisma } from '../generated/prisma/client';

@Injectable()
export class ContratService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Contrat[]> {
    return this.prisma.contrat.findMany({
      orderBy: { dateDebut: 'desc' },
      include: { user: true, organization: true },
    });
  }

  async findByUserId(userId: string): Promise<Contrat[]> {
    return this.prisma.contrat.findMany({
      where: { userId },
      orderBy: { dateDebut: 'desc' },
      include: { organization: true },
    });
  }

  async findOne(id: string): Promise<Contrat> {
    const row = await this.prisma.contrat.findUnique({
      where: { id },
      include: { user: true, organization: true },
    });
    if (!row) {
      throw new NotFoundException('Contrat introuvable');
    }
    return row;
  }

  async create(data: Prisma.ContratCreateInput): Promise<Contrat> {
    return this.prisma.contrat.create({
      data,
      include: { user: true, organization: true },
    });
  }

  async update(id: string, data: Prisma.ContratUpdateInput): Promise<Contrat> {
    await this.findOne(id);
    return this.prisma.contrat.update({
      where: { id },
      data,
      include: { user: true, organization: true },
    });
  }

  async remove(id: string): Promise<Contrat> {
    const row = await this.findOne(id);
    await this.prisma.contrat.delete({ where: { id } });
    return row;
  }
}
