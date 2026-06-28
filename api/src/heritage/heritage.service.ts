import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import {
  assertOrganizationResourceAccess,
  isMainOrganizationUser,
  organizationListWhere,
} from '../auth/organization-scope';
import {
  assertMainOrgPoleDomain,
  POLE_DOMAIN,
} from '../auth/pole-scope';
import { PrismaService } from '../prisma/prisma.service';
import type { HeritageAssetStatus, Prisma } from '../generated/prisma/client';
import type { CreateHeritageAssetDto, UpdateHeritageAssetDto } from './dto/heritage.dto';

@Injectable()
export class HeritageService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(viewer: AuthenticatedUser) {
    const orgFilter = organizationListWhere(viewer);
    const where: Prisma.HeritageAssetWhereInput =
      'organizationId' in orgFilter && orgFilter.organizationId
        ? { organizationId: orgFilter.organizationId }
        : {};
    return this.prisma.heritageAsset.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, viewer: AuthenticatedUser) {
    const row = await this.prisma.heritageAsset.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException('Actif patrimonial introuvable.');
    }
    assertOrganizationResourceAccess(viewer, row.organizationId);
    return row;
  }

  async create(dto: CreateHeritageAssetDto, viewer: AuthenticatedUser) {
    if (isMainOrganizationUser(viewer)) {
      assertMainOrgPoleDomain(viewer, POLE_DOMAIN.HERITAGE);
    }
    assertOrganizationResourceAccess(viewer, dto.organizationId);
    return this.prisma.heritageAsset.create({
      data: {
        organizationId: dto.organizationId,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        location: dto.location?.trim() || null,
        value: dto.value ?? null,
        status: (dto.status as HeritageAssetStatus | undefined) ?? 'ACTIVE',
      },
    });
  }

  async update(id: string, dto: UpdateHeritageAssetDto, viewer: AuthenticatedUser) {
    await this.findOne(id, viewer);
    if (isMainOrganizationUser(viewer)) {
      assertMainOrgPoleDomain(viewer, POLE_DOMAIN.HERITAGE);
    }
    return this.prisma.heritageAsset.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description?.trim() || null }
          : {}),
        ...(dto.location !== undefined
          ? { location: dto.location?.trim() || null }
          : {}),
        ...(dto.value !== undefined ? { value: dto.value } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      },
    });
  }

  async remove(id: string, viewer: AuthenticatedUser) {
    await this.findOne(id, viewer);
    if (isMainOrganizationUser(viewer)) {
      assertMainOrgPoleDomain(viewer, POLE_DOMAIN.HERITAGE);
    }
    return this.prisma.heritageAsset.delete({ where: { id } });
  }
}
