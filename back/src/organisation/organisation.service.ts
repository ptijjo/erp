import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Organization, OrganizationType } from '../generated/prisma/client';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
} from './dto/organization';
import { slugify } from '../lib/Slugify';

@Injectable()
export class OrganisationService {
  constructor(private readonly prisma: PrismaService) {}

  public getAllOrganisations = async (): Promise<Organization[]> => {
    return await this.prisma.organization.findMany();
  };

  public getOrganisationById = async (id: string): Promise<Organization> => {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
    });
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }
    return organization;
  };

  public createOrganisation = async (
    data: CreateOrganizationDto,
  ): Promise<Organization> => {
    const slug = slugify(data.slug);
    const existingOrganization = await this.prisma.organization.findUnique({
      where: { slug },
    });
    if (existingOrganization) {
      throw new BadRequestException(
        'Une organisation avec ce slug existe déjà.',
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
        ...(description !== undefined ? { description } : {}),
      },
    });
  };

  public updateOrganisation = async (
    id: string,
    data: UpdateOrganizationDto,
  ): Promise<Organization> => {
    const existingOrganization = await this.prisma.organization.findUnique({
      where: { id },
    });
    if (!existingOrganization) {
      throw new NotFoundException('Organization not found');
    }
    return await this.prisma.organization.update({
      where: { id },
      data: {
        ...data,
      },
    });
  };

  public deleteOrganisation = async (id: string): Promise<Organization> => {
    const existingOrganization = await this.prisma.organization.findUnique({
      where: { id },
    });
    if (!existingOrganization) {
      throw new NotFoundException('Organization not found');
    }
    return await this.prisma.organization.delete({
      where: { id },
    });
  };

  public addUserToOrganisation = async (
    id: string,
    userId: string,
  ): Promise<Organization> => {
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
  ): Promise<Organization> => {
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
}
