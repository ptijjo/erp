import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { VentePaiement, Prisma } from '../generated/prisma/client';

@Injectable()
export class VentePaiementService {
  constructor(private readonly prisma: PrismaService) {}

  async findByVenteId(venteId: string): Promise<VentePaiement[]> {
    return this.prisma.ventePaiement.findMany({ where: { venteId } });
  }

  async findOne(id: string): Promise<VentePaiement> {
    const row = await this.prisma.ventePaiement.findUnique({
      where: { id },
      include: { vente: true },
    });
    if (!row) {
      throw new NotFoundException('Paiement de vente introuvable');
    }
    return row;
  }

  async create(data: Prisma.VentePaiementCreateInput): Promise<VentePaiement> {
    return this.prisma.ventePaiement.create({ data });
  }

  async update(
    id: string,
    data: Prisma.VentePaiementUpdateInput,
  ): Promise<VentePaiement> {
    await this.findOne(id);
    return this.prisma.ventePaiement.update({ where: { id }, data });
  }

  async remove(id: string): Promise<VentePaiement> {
    const row = await this.findOne(id);
    await this.prisma.ventePaiement.delete({ where: { id } });
    return row;
  }
}
