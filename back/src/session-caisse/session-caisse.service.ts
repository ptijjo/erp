import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { SessionCaisse, Prisma } from '../generated/prisma/client';

@Injectable()
export class SessionCaisseService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<SessionCaisse[]> {
    return this.prisma.sessionCaisse.findMany({
      orderBy: { openedAt: 'desc' },
      include: { organization: true, user: true, closedByUser: true },
    });
  }

  async findOpenByOrganization(
    organizationId: string,
  ): Promise<SessionCaisse | null> {
    return this.prisma.sessionCaisse.findFirst({
      where: { organizationId, statut: 'OUVERTE' },
      include: { user: true },
    });
  }

  async findOne(id: string): Promise<SessionCaisse> {
    const row = await this.prisma.sessionCaisse.findUnique({
      where: { id },
      include: {
        organization: true,
        user: true,
        closedByUser: true,
        ventes: true,
      },
    });
    if (!row) {
      throw new NotFoundException('Session de caisse introuvable');
    }
    return row;
  }

  async create(data: Prisma.SessionCaisseCreateInput): Promise<SessionCaisse> {
    return this.prisma.sessionCaisse.create({
      data,
      include: { organization: true, user: true },
    });
  }

  async update(
    id: string,
    data: Prisma.SessionCaisseUpdateInput,
  ): Promise<SessionCaisse> {
    await this.findOne(id);
    return this.prisma.sessionCaisse.update({
      where: { id },
      data,
      include: { organization: true, user: true, closedByUser: true },
    });
  }

  async remove(id: string): Promise<SessionCaisse> {
    const row = await this.findOne(id);
    await this.prisma.sessionCaisse.delete({ where: { id } });
    return row;
  }
}
