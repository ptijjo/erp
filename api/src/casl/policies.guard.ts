import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CHECK_POLICIES_KEY } from './check-policies.decorator';
import type { PolicyRule } from './policy.types';
import { CaslAbilityFactory } from './casl-ability.factory';

@Injectable()
export class PoliciesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly caslAbilityFactory: CaslAbilityFactory,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const policies = this.reflector.getAllAndOverride<PolicyRule[] | undefined>(
      CHECK_POLICIES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!policies?.length) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException();
    }

    const ability = await this.caslAbilityFactory.createForUser(user);
    const allowed = policies.every((rule) =>
      ability.can(rule.action, rule.subject),
    );
    if (!allowed) {
      throw new ForbiddenException();
    }
    return true;
  }
}
