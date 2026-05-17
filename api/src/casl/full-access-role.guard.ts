import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { isFullAccessRoleName } from './define-ability';

/**
 * Réservé aux rôles ADMIN, DIRECTOR_GENERAL, DIRECTOR_OPERATIONS
 * (modification des permissions et liaisons rôle ↔ permission).
 */
@Injectable()
export class FullAccessRoleGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;
    if (!user?.role?.name || !isFullAccessRoleName(user.role.name)) {
      throw new ForbiddenException(
        'Seuls l’administrateur, le directeur général et le directeur des opérations peuvent modifier les permissions.',
      );
    }
    return true;
  }
}
