import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import {
  assertMainOrganizationOnly,
  assertOrganizationResourceAccess,
  isMainOrganizationUser,
} from '../auth/organization-scope';
import { PrismaService } from '../prisma/prisma.service';
import { Organization, OrganizationType } from '../generated/prisma/client';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
} from './dto/organization';
import { SetOrganizationCatalogDto } from './dto/set-organization-catalog.dto';
import { slugify } from '../lib/Slugify';
import type { PaginationQueryDto } from '../lib/pagination-query.dto';
import {
  buildPaginationMeta,
  paginationSkip,
  resolvePagination,
  type PaginatedResult,
} from '../lib/pagination';

@Injectable()
export class OrganisationService {
  constructor(private readonly prisma: PrismaService) {}

  public getAllOrganisations = async (
    viewer: AuthenticatedUser,
    query: PaginationQueryDto = {},
  ): Promise<PaginatedResult<Organization>> => {
    const where = isMainOrganizationUser(viewer)
      ? {}
      : { id: viewer.organisationId };
    const { page, limit } = resolvePagination(query);
    const [items, total] = await Promise.all([
      this.prisma.organization.findMany({
        where,
        orderBy: [{ organizationType: 'asc' }, { name: 'asc' }],
        skip: paginationSkip(page, limit),
        take: limit,
      }),
      this.prisma.organization.count({ where }),
    ]);
    return { items, meta: buildPaginationMeta(total, page, limit) };
  };

  public getOrganisationById = async (
    id: string,
    viewer: AuthenticatedUser,
  ): Promise<Organization> => {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
    });
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }
    assertOrganizationResourceAccess(viewer, organization.id);
    return organization;
  };

  public createOrganisation = async (
    data: CreateOrganizationDto,
    viewer: AuthenticatedUser,
  ): Promise<Organization> => {
    assertMainOrganizationOnly(viewer);
    const slug = slugify(data.slug);
    const existingOrganization = await this.prisma.organization.findUnique({
      where: { slug },
    });
    if (existingOrganization) {
      throw new BadRequestException(
        'Une organisation avec ce slug existe déjà.',
      );
    }
    const main = await this.prisma.organization.findFirst({
      where: {
        organizationType: OrganizationType.MAIN,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!main) {
      throw new BadRequestException(
        'Maison mère introuvable : impossible de rattacher une filiale.',
      );
    }
    const description =
      data.description !== undefined && String(data.description).trim() !== ''
        ? String(data.description).trim()
        : undefined;
    return await this.prisma.organization.create({
      data: {
        name: data.name,
        slug,
        organizationType: OrganizationType.SUBSIDIARY,
        parentId: main.id,
        ...(description !== undefined ? { description } : {}),
      },
    });
  };

  public updateOrganisation = async (
    id: string,
    data: UpdateOrganizationDto,
    viewer: AuthenticatedUser,
  ): Promise<Organization> => {
    const existingOrganization = await this.prisma.organization.findUnique({
      where: { id },
    });
    if (!existingOrganization) {
      throw new NotFoundException('Organization not found');
    }
    assertMainOrganizationOnly(viewer);
    return await this.prisma.organization.update({
      where: { id },
      data: {
        ...data,
      },
    });
  };

  public deleteOrganisation = async (
    id: string,
    viewer: AuthenticatedUser,
  ): Promise<Organization> => {
    assertMainOrganizationOnly(viewer);
    const existingOrganization = await this.prisma.organization.findUnique({
      where: { id },
    });
    if (!existingOrganization) {
      throw new NotFoundException('Organization not found');
    }
    if (existingOrganization.organizationType === OrganizationType.MAIN) {
      throw new BadRequestException(
        'La maison mère ne peut pas être supprimée.',
      );
    }
    return await this.prisma.organization.delete({
      where: { id },
    });
  };

  public addUserToOrganisation = async (
    id: string,
    userId: string,
    viewer: AuthenticatedUser,
  ): Promise<Organization> => {
    assertMainOrganizationOnly(viewer);
    const existingOrganization = await this.prisma.organization.findUnique({
      where: { id },
    });
    if (!existingOrganization) {
      throw new NotFoundException('Organization not found');
    }
    return await this.prisma.organization.update({
      where: { id },
      data: {
        users: {
          connect: { id: userId },
        },
      },
    });
  };

  public removeUserFromOrganisation = async (
    id: string,
    userId: string,
    viewer: AuthenticatedUser,
  ): Promise<Organization> => {
    assertMainOrganizationOnly(viewer);
    const existingOrganization = await this.prisma.organization.findUnique({
      where: { id },
    });
    if (!existingOrganization) {
      throw new NotFoundException('Organization not found');
    }
    return await this.prisma.organization.update({
      where: { id },
      data: {
        users: {
          disconnect: { id: userId },
        },
      },
    });
  };

  /** Catalogue produits / catégories pour une filiale (lecture : maison mère uniquement). */
  async getOrganizationCatalog(
    id: string,
    viewer: AuthenticatedUser,
  ): Promise<{ categoryIds: string[]; productIds: string[] }> {
    const org = await this.getOrganisationById(id, viewer);
    assertMainOrganizationOnly(viewer);
    if (org.organizationType !== OrganizationType.SUBSIDIARY) {
      throw new BadRequestException(
        'Le catalogue par filiale ne s’applique qu’aux organisations de type filiale.',
      );
    }
    const [cats, prods] = await Promise.all([
      this.prisma.organizationCatalogCategory.findMany({
        where: { organizationId: id },
        select: { categoryId: true },
      }),
      this.prisma.organizationCatalogProduct.findMany({
        where: { organizationId: id },
        select: { productId: true },
      }),
    ]);
    return {
      categoryIds: cats.map((c) => c.categoryId),
      productIds: prods.map((p) => p.productId),
    };
  }

  /** Enregistre le catalogue filiale (catégories + sous-arbres, produits additionnels). */
  async setOrganizationCatalog(
    id: string,
    dto: SetOrganizationCatalogDto,
    viewer: AuthenticatedUser,
  ): Promise<{ categoryIds: string[]; productIds: string[] }> {
    assertMainOrganizationOnly(viewer);
    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org) {
      throw new NotFoundException('Organization not found');
    }
    if (org.organizationType !== OrganizationType.SUBSIDIARY) {
      throw new BadRequestException(
        'Le catalogue par filiale ne s’applique qu’aux organisations de type filiale.',
      );
    }

    const catIds = [...new Set(dto.categoryIds)];
    const prodIds = [...new Set(dto.productIds)];

    if (catIds.length > 0) {
      const found = await this.prisma.category.count({
        where: { id: { in: catIds } },
      });
      if (found !== catIds.length) {
        throw new BadRequestException(
          'Une ou plusieurs catégories sont invalides.',
        );
      }
    }
    if (prodIds.length > 0) {
      const prods = await this.prisma.product.findMany({
        where: { id: { in: prodIds } },
        select: { id: true, offeredToSubsidiaries: true },
      });
      if (prods.length !== prodIds.length) {
        throw new BadRequestException('Un ou plusieurs produits sont invalides.');
      }
      const notOffered = prods.filter((p) => !p.offeredToSubsidiaries);
      if (notOffered.length > 0) {
        throw new BadRequestException(
          'Seuls les produits marqués « proposés aux filiales » peuvent être affectés.',
        );
      }
    }

    await this.prisma.$transaction([
      this.prisma.organizationCatalogCategory.deleteMany({
        where: { organizationId: id },
      }),
      this.prisma.organizationCatalogProduct.deleteMany({
        where: { organizationId: id },
      }),
    ]);

    if (catIds.length > 0) {
      await this.prisma.organizationCatalogCategory.createMany({
        data: catIds.map((categoryId) => ({
          organizationId: id,
          categoryId,
        })),
        skipDuplicates: true,
      });
    }
    if (prodIds.length > 0) {
      await this.prisma.organizationCatalogProduct.createMany({
        data: prodIds.map((productId) => ({
          organizationId: id,
          productId,
        })),
        skipDuplicates: true,
      });
    }

    return this.getOrganizationCatalog(id, viewer);
  }
}
