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
import { rlsRequestContext, type RlsRequestStore } from './rls-request-context';

/**
 * Mémorise l’organisation de la requête HTTP.
 * L’extension Prisma pose ensuite `set_config(..., true)` dans la transaction
 * qui exécute le SQL, pour que le pool ne réutilise pas le contexte d’un autre client.
 */
@Injectable()
export class RlsContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();

    /** SSE long-lived : pas de contexte RLS (aucune requête métier sur ce flux). */
    const path = req.originalUrl ?? req.url ?? '';
    if (path.includes('/realtime/events')) {
      return next.handle();
    }

    const user = req.user;
    const store: RlsRequestStore = {
      organizationId: user?.organisationId ?? null,
      userId: user?.sub ?? null,
      isMain: user ? isMainOrganizationUser(user) : false,
      bypass: false,
    };

    return new Observable((subscriber) => {
      let inner: Subscription | undefined;
      rlsRequestContext.run(store, () => {
        inner = next.handle().subscribe(subscriber);
      });
      return () => inner?.unsubscribe();
    });
  }
}
