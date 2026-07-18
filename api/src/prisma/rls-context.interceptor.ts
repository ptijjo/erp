import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import type { Subscription } from 'rxjs';
import { Observable } from 'rxjs';
import type { AuthenticatedUser } from '../auth/auth.types';
import { isMainOrganizationUser } from '../auth/organization-scope';
import { PrismaService } from './prisma.service';
import { rlsRequestContext } from './rls-request-context';

/**
 * Pose le contexte RLS (ALS + variables de session Postgres) pour la durée de la requête.
 * Réinitialise les variables en fin de requête pour limiter les fuites via le pool.
 *
 * Prérequis : connexion Postgres directe (pas de pooler en mode « transaction »
 * type PgBouncer transaction), sinon les `set_config(..., false)` peuvent fuiter
 * entre requêtes HTTP.
 */
@Injectable()
export class RlsContextInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<
      Request & { user?: AuthenticatedUser }
    >();

    /** SSE long-lived : pas de set_config pool (fuite + inutile). */
    const path = req.originalUrl ?? req.url ?? '';
    if (path.includes('/realtime/events')) {
      return next.handle();
    }

    const user = req.user;

    const store = {
      organizationId: user?.organisationId ?? null,
      userId: user?.sub ?? null,
      isMain: user ? isMainOrganizationUser(user) : false,
      bypass: false,
    };

    return new Observable((subscriber) => {
      let inner: Subscription | undefined;
      let cancelled = false;

      void (async () => {
        try {
          await this.applySession(store);
          if (cancelled) return;
          rlsRequestContext.run(store, () => {
            inner = next.handle().subscribe({
              next: (v) => subscriber.next(v),
              error: (err) => {
                void this.clearSession().finally(() => subscriber.error(err));
              },
              complete: () => {
                void this.clearSession().finally(() => subscriber.complete());
              },
            });
          });
        } catch (err) {
          subscriber.error(err);
        }
      })();

      return () => {
        cancelled = true;
        inner?.unsubscribe();
        void this.clearSession();
      };
    });
  }

  private async applySession(store: {
    organizationId: string | null;
    userId: string | null;
    isMain: boolean;
    bypass: boolean;
  }): Promise<void> {
    await this.prisma.$executeRawUnsafe(
      `SELECT set_config('app.organization_id', $1, false),
              set_config('app.user_id', $2, false),
              set_config('app.is_main', $3, false),
              set_config('app.rls_bypass', $4, false)`,
      store.organizationId ?? '',
      store.userId ?? '',
      store.isMain ? 'true' : 'false',
      store.bypass ? 'on' : '',
    );
  }

  private async clearSession(): Promise<void> {
    try {
      await this.prisma.$executeRawUnsafe(
        `SELECT set_config('app.organization_id', '', false),
                set_config('app.user_id', '', false),
                set_config('app.is_main', '', false),
                set_config('app.rls_bypass', '', false)`,
      );
    } catch {
      /* connexion déjà fermée */
    }
  }
}
