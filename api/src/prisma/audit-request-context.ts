import { AsyncLocalStorage } from 'node:async_hooks';

export type AuditRequestContextStore = {
  userId: string | null;
  organizationId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
};

export const auditRequestContext =
  new AsyncLocalStorage<AuditRequestContextStore>();

export function getAuditRequestContext():
  | AuditRequestContextStore
  | undefined {
  return auditRequestContext.getStore();
}
