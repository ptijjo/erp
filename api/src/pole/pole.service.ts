import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { assertMainOrganizationOnly } from '../auth/organization-scope';
import { PrismaService } from '../prisma/prisma.service';
import { MAISON_MERE_POLES } from '../seeder/maison-mere-poles';
import type { CreatePoleDto } from './dto/create-pole.dto';
import type { UpdatePoleDto } from './dto/update-pole.dto';

const SYSTEM_POLE_CODES: ReadonlySet<string> = new Set(
  MAISON_MERE_POLES.map((p) => p.code),
);

@Injectable()
export class PoleService {
  constructor(private readonly prisma: PrismaService) {}

  /** Catalogue des pôles de la maison mère : inaccessible aux utilisateurs de filiale. */
  async findAll(viewer: AuthenticatedUser) {
    assertMainOrganizationOnly(viewer);
    return this.prisma.pole.findMany({
      orderBy: { code: 'asc' },
    });
  }

  async findOne(id: string, viewer: AuthenticatedUser) {
    assertMainOrganizationOnly(viewer);
    const pole = await this.prisma.pole.findUnique({ where: { id } });
    if (!pole) {
      throw new NotFoundException('Pôle introuvable');
    }
    return pole;
  }

  async create(dto: CreatePoleDto, viewer: AuthenticatedUser) {
    assertMainOrganizationOnly(viewer);
    const code = dto.code.trim();
    const name = dto.name.trim();
    try {
      return await this.prisma.pole.create({
        data: {
          code,
          name,
          description: dto.description ?? null,
        },
      });
    } catch (e: unknown) {
      if (
        e &&
        typeof e === 'object' &&
        'code' in e &&
        e.code === 'P2002'
      ) {
        throw new ConflictException('Un pôle avec ce code existe déjà.');
      }
      throw e;
    }
  }

  async update(id: string, dto: UpdatePoleDto, viewer: AuthenticatedUser) {
    assertMainOrganizationOnly(viewer);
    const existing = await this.findOne(id, viewer);

    if (
      dto.code !== undefined &&
      dto.code !== existing.code &&
      SYSTEM_POLE_CODES.has(existing.code)
    ) {
      throw new BadRequestException(
        'Le code d’un pôle système (seed VIFAA) ne peut pas être modifié.',
      );
    }

    const data: {
      code?: string;
      name?: string;
      description?: string | null;
    } = {};
    if (dto.code !== undefined) {
      data.code = dto.code.trim();
    }
    if (dto.name !== undefined) {
      data.name = dto.name.trim();
    }
    if (dto.description !== undefined) {
      data.description = dto.description;
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('Aucune modification à appliquer.');
    }

    try {
      return await this.prisma.pole.update({
        where: { id },
        data,
      });
    } catch (e: unknown) {
      if (
        e &&
        typeof e === 'object' &&
        'code' in e &&
        e.code === 'P2002'
      ) {
        throw new ConflictException('Un pôle avec ce code existe déjà.');
      }
      throw e;
    }
  }

  async remove(id: string, viewer: AuthenticatedUser) {
    assertMainOrganizationOnly(viewer);
    await this.findOne(id, viewer);

    // `Role.poleId` → onDelete: SetNull : les rôles restent, sans pôle.
    return this.prisma.pole.delete({ where: { id } });
  }
}
