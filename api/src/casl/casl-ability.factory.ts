import { Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { AppCacheService } from '../cache/app-cache.service';
import {
  buildAbilityFromPermissionNames,
  caslCacheKeyForRole,
  defineAbilityFor,
  isFullAccessRoleName,
  type AppAbility,
} from './define-ability';

const CASL_CACHE_TTL_SECONDS = 300;

@Injectable()
export class CaslAbilityFactory {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: AppCacheService,
  ) {}

  async createForUser(user: AuthenticatedUser): Promise<AppAbility> {
    if (isFullAccessRoleName(user.role.name) || !user.role?.id) {
      return defineAbilityFor(user);
    }

    const cacheKey = caslCacheKeyForRole(user.role.id);
    const cached = await this.cache.getJson<string[]>(cacheKey);
    if (cached) {
      return buildAbilityFromPermissionNames(user, cached);
    }

    const links = await this.prisma.permissionRole.findMany({
      where: { roleId: user.role.id },
      include: { permission: true },
    });

    if (links.length === 0) {
      return defineAbilityFor(user);
    }

    const names = links.map((row) => row.permission.name);
    await this.cache.setJson(cacheKey, names, CASL_CACHE_TTL_SECONDS);
    return buildAbilityFromPermissionNames(user, names);
  }

  async invalidateRole(roleId: string): Promise<void> {
    await this.cache.del(caslCacheKeyForRole(roleId));
  }
}
