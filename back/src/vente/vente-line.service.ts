import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { VenteLine, Prisma } from '../generated/prisma/client';

@Injectable()
export class VenteLineService {
  constructor(private readonly prisma: PrismaService) {}

  async findByVenteId(venteId: string): Promise<VenteLine[]> {
    return this.prisma.venteLine.findMany({
      where: { venteId },
      include: { product: true },
    });
  }

  async findOne(id: string): Promise<VenteLine> {
    const row = await this.prisma.venteLine.findUnique({
      where: { id },
      include: { product: true, vente: true },
    });
    if (!row) {
      throw new NotFoundException('Ligne de vente introuvable');
    }
    return row;
  }

  async create(data: Prisma.VenteLineCreateInput): Promise<VenteLine> {
    return this.prisma.venteLine.create({
      data,
      include: { product: true },
    });
  }

  async update(
    id: string,
    data: Prisma.VenteLineUpdateInput,
  ): Promise<VenteLine> {
    await this.findOne(id);
    return this.prisma.venteLine.update({
      where: { id },
      data,
      include: { product: true },
    });
  }

  async remove(id: string): Promise<VenteLine> {
    const row = await this.findOne(id);
    await this.prisma.venteLine.delete({ where: { id } });
    return row;
  }
}
