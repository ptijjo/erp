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
import type { MarketingCampaignStatus, Prisma } from '../generated/prisma/client';
import type { CreateMarketingCampaignDto, UpdateMarketingCampaignDto } from './dto/marketing.dto';

@Injectable()
export class MarketingService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(viewer: AuthenticatedUser) {
    const orgFilter = organizationListWhere(viewer);
    const where: Prisma.MarketingCampaignWhereInput =
      'organizationId' in orgFilter && orgFilter.organizationId
        ? { organizationId: orgFilter.organizationId }
        : {};
    return this.prisma.marketingCampaign.findMany({
      where,
      orderBy: { title: 'asc' },
    });
  }

  async findOne(id: string, viewer: AuthenticatedUser) {
    const row = await this.prisma.marketingCampaign.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException('Campagne marketing introuvable.');
    }
    assertOrganizationResourceAccess(viewer, row.organizationId);
    return row;
  }

  async create(dto: CreateMarketingCampaignDto, viewer: AuthenticatedUser) {
    if (isMainOrganizationUser(viewer)) {
      assertMainOrgPoleDomain(viewer, POLE_DOMAIN.MARKETING);
    }
    assertOrganizationResourceAccess(viewer, dto.organizationId);
    return this.prisma.marketingCampaign.create({
      data: {
        organizationId: dto.organizationId,
        title: dto.title.trim(),
        channel: dto.channel.trim(),
        description: dto.description?.trim() || null,
        status: (dto.status as MarketingCampaignStatus | undefined) ?? 'DRAFT',
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        budget: dto.budget ?? null,
      },
    });
  }

  async update(id: string, dto: UpdateMarketingCampaignDto, viewer: AuthenticatedUser) {
    await this.findOne(id, viewer);
    if (isMainOrganizationUser(viewer)) {
      assertMainOrgPoleDomain(viewer, POLE_DOMAIN.MARKETING);
    }
    return this.prisma.marketingCampaign.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.channel !== undefined ? { channel: dto.channel.trim() } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description?.trim() || null }
          : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.startDate !== undefined
          ? { startDate: dto.startDate ? new Date(dto.startDate) : null }
          : {}),
        ...(dto.endDate !== undefined
          ? { endDate: dto.endDate ? new Date(dto.endDate) : null }
          : {}),
        ...(dto.budget !== undefined ? { budget: dto.budget } : {}),
      },
    });
  }

  async remove(id: string, viewer: AuthenticatedUser) {
    await this.findOne(id, viewer);
    if (isMainOrganizationUser(viewer)) {
      assertMainOrgPoleDomain(viewer, POLE_DOMAIN.MARKETING);
    }
    return this.prisma.marketingCampaign.delete({ where: { id } });
  }
}
