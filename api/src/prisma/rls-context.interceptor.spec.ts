import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, Observable } from 'rxjs';
import type { AuthenticatedUser } from '../auth/auth.types';
import { getRlsRequestStore } from './rls-request-context';
import { RlsContextInterceptor } from './rls-context.interceptor';

const user: AuthenticatedUser = {
  email: 'a@test.local',
  sub: 'user-1',
  organisationId: 'org-1',
  organizationType: 'SUBSIDIARY',
  organizationSlug: 'filiale',
  firstLogin: false,
  role: {
    id: 'role-1',
    name: 'MANAGER',
    description: null,
    poleCode: null,
  },
};

function contextFor(
  path: string,
  current?: AuthenticatedUser,
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        originalUrl: path,
        user: current,
      }),
    }),
  } as ExecutionContext;
}

describe('RlsContextInterceptor', () => {
  const interceptor = new RlsContextInterceptor();

  it('expose l’organisation de la requête aux requêtes async suivantes', async () => {
    let seen: { organizationId?: string | null; isMain?: boolean } | undefined;
    const next: CallHandler = {
      handle: () =>
        new Observable((subscriber) => {
          void (async () => {
            await Promise.resolve();
            const store = getRlsRequestStore();
            seen = {
              organizationId: store?.organizationId,
              isMain: store?.isMain,
            };
            subscriber.next('ok');
            subscriber.complete();
          })();
        }),
    };

    await expect(
      lastValueFrom(interceptor.intercept(contextFor('/budgets', user), next)),
    ).resolves.toBe('ok');
    expect(seen).toEqual({ organizationId: 'org-1', isMain: false });
  });

  it('ne pose pas de contexte sur le flux SSE', async () => {
    let seen = 'unset';
    const next: CallHandler = {
      handle: () =>
        new Observable((subscriber) => {
          seen = getRlsRequestStore() ? 'set' : 'absent';
          subscriber.next('stream');
          subscriber.complete();
        }),
    };

    await expect(
      lastValueFrom(
        interceptor.intercept(contextFor('/realtime/events', user), next),
      ),
    ).resolves.toBe('stream');
    expect(seen).toBe('absent');
  });
});
