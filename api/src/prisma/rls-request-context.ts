import { AsyncLocalStorage } from 'node:async_hooks';

export type RlsRequestStore = {
  organizationId: string | null;
  userId: string | null;
  isMain: boolean;
  /** Seeder / cron / tests hors HTTP. */
  bypass: boolean;
};

export const rlsRequestContext = new AsyncLocalStorage<RlsRequestStore>();

export function getRlsRequestStore(): RlsRequestStore | undefined {
  return rlsRequestContext.getStore();
}
