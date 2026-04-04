import { Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { defineAbilityFor, type AppAbility } from './define-ability';

@Injectable()
export class CaslAbilityFactory {
  createForUser(user: AuthenticatedUser): AppAbility {
    return defineAbilityFor(user);
  }
}
