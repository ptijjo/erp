import { Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import {
  buildAbilityFromDatabase,
  type AppAbility,
} from './define-ability';

@Injectable()
export class CaslAbilityFactory {
  constructor(private readonly prisma: PrismaService) {}

  createForUser(user: AuthenticatedUser): Promise<AppAbility> {
    return buildAbilityFromDatabase(user, this.prisma);
  }
}
