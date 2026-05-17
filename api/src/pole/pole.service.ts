import {
  ConflictException,
  Injectable,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { assertMainOrganizationOnly } from '../auth/organization-scope';
import { PrismaService } from '../prisma/prisma.service';
import type { CreatePoleDto } from './dto/create-pole.dto';

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
}
