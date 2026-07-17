import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import {
  assertOrganizationResourceAccess,
  organizationListWhere,
} from '../auth/organization-scope';
import { PrismaService } from '../prisma/prisma.service';
import type { Prisma, SpiritualEventStatus } from '../generated/prisma/client';
import type { CreateSpiritualEventDto, UpdateSpiritualEventDto } from './dto/spiritual.dto';

@Injectable()
export class SpiritualService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(viewer: AuthenticatedUser) {
    const orgFilter = organizationListWhere(viewer);
    const where: Prisma.SpiritualEventWhereInput =
      'organizationId' in orgFilter && orgFilter.organizationId
        ? { organizationId: orgFilter.organizationId }
        : {};
    return this.prisma.spiritualEvent.findMany({
      where,
      orderBy: { title: 'asc' },
    });
  }

  async findOne(id: string, viewer: AuthenticatedUser) {
    const row = await this.prisma.spiritualEvent.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException('Événement introuvable.');
    }
    assertOrganizationResourceAccess(viewer, row.organizationId);
    return row;
  }

  async create(dto: CreateSpiritualEventDto, viewer: AuthenticatedUser) {
    assertOrganizationResourceAccess(viewer, dto.organizationId);
    return this.prisma.spiritualEvent.create({
      data: {
        organizationId: dto.organizationId,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        location: dto.location?.trim() || null,
        eventDate: dto.eventDate ? new Date(dto.eventDate) : null,
        status: (dto.status as SpiritualEventStatus | undefined) ?? 'PLANNED',
      },
    });
  }

  async update(id: string, dto: UpdateSpiritualEventDto, viewer: AuthenticatedUser) {
    await this.findOne(id, viewer);
    return this.prisma.spiritualEvent.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description?.trim() || null }
          : {}),
        ...(dto.location !== undefined
          ? { location: dto.location?.trim() || null }
          : {}),
        ...(dto.eventDate !== undefined
          ? { eventDate: dto.eventDate ? new Date(dto.eventDate) : null }
          : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      },
    });
  }

  async remove(id: string, viewer: AuthenticatedUser) {
    await this.findOne(id, viewer);
    return this.prisma.spiritualEvent.delete({ where: { id } });
  }
}
