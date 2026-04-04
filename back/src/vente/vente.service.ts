import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Vente, Prisma } from '../generated/prisma/client';

@Injectable()
export class VenteService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Vente[]> {
    return this.prisma.vente.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        organization: true,
        user: true,
        sessionCaisse: true,
        lignes: { include: { product: true } },
        paiements: true,
      },
    });
  }

  async findByOrganizationId(organizationId: string): Promise<Vente[]> {
    return this.prisma.vente.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      include: {
        organization: { select: { id: true, name: true, organizationType: true } },
        user: true,
        sessionCaisse: true,
        lignes: { include: { product: true } },
        paiements: true,
      },
    });
  }

  async findOne(id: string): Promise<Vente> {
    const row = await this.prisma.vente.findUnique({
      where: { id },
      include: {
        organization: true,
        user: true,
        sessionCaisse: true,
        lignes: { include: { product: true } },
        paiements: true,
      },
    });
    if (!row) {
      throw new NotFoundException('Vente introuvable');
    }
    return row;
  }

  async create(data: Prisma.VenteCreateInput): Promise<Vente> {
    return this.prisma.vente.create({
      data,
      include: {
        organization: true,
        user: true,
        sessionCaisse: true,
        lignes: { include: { product: true } },
        paiements: true,
      },
    });
  }

  async update(id: string, data: Prisma.VenteUpdateInput): Promise<Vente> {
    await this.findOne(id);
    return this.prisma.vente.update({
      where: { id },
      data,
      include: {
        organization: true,
        user: true,
        sessionCaisse: true,
        lignes: { include: { product: true } },
        paiements: true,
      },
    });
  }

  async remove(id: string): Promise<Vente> {
    const row = await this.findOne(id);
    await this.prisma.vente.delete({ where: { id } });
    return row;
  }
}
