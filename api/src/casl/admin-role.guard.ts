import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';

/**
 * Réservé au rôle système ADMIN uniquement (catalogue des permissions, CRUD Permission).
 */
@Injectable()
export class AdminRoleGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;
    if (user?.role?.name !== 'ADMIN') {
      throw new ForbiddenException(
        'Cette action est réservée à l’administrateur.',
      );
    }
    return true;
  }
}
