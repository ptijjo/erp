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
import { auditRequestContext } from './audit-request-context';

@Injectable()
export class AuditContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<
      Request & { user?: AuthenticatedUser }
    >();
    const user = req.user;

    const store = {
      userId: user?.sub ?? null,
      organizationId: user?.organisationId ?? null,
      ipAddress: (req.ip ?? req.socket?.remoteAddress ?? null) as string | null,
      userAgent: req.get('user-agent') ?? null,
    };

    return new Observable((subscriber) => {
      let inner: Subscription | undefined;
      auditRequestContext.run(store, () => {
        inner = next.handle().subscribe(subscriber);
      });
      return () => inner?.unsubscribe();
    });
  }
}
