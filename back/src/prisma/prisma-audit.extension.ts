import { Logger } from '@nestjs/common';
import type { AuditAction } from '../generated/prisma/client';
import { PrismaClient } from '../generated/prisma/client';
import type { Prisma } from '../generated/prisma/client';
import { getAuditRequestContext } from './audit-request-context';

const log = new Logger('PrismaAudit');

/** Pas de journalisation récursive ni pour les tentatives de connexion (bruit). */
const SKIP_MODELS = new Set(['AuditLog', 'LoginAttempt']);

const MUTATION_OPS = new Set([
  'create',
  'createMany',
  'update',
  'updateMany',
  'upsert',
  'delete',
  'deleteMany',
]);

function operationToAction(operation: string): AuditAction | null {
  if (operation === 'create' || operation === 'createMany') {
    return 'CREATE';
  }
  if (
    operation === 'update' ||
    operation === 'updateMany' ||
    operation === 'upsert'
  ) {
    return 'UPDATE';
  }
  if (operation === 'delete' || operation === 'deleteMany') {
    return 'DELETE';
  }
  return null;
}

function safeDetails(value: unknown): Prisma.InputJsonValue | undefined {
  try {
    const json = JSON.stringify(value, (_key, v) =>
      typeof v === 'bigint' ? v.toString() : v,
    );
    const parsed = JSON.parse(json) as Prisma.InputJsonValue;
    return parsed;
  } catch {
    return undefined;
  }
}

function pickEntityIdAndDetails(
  model: string,
  operation: string,
  args: unknown,
  result: unknown,
): { entityId?: string; details?: Prisma.InputJsonValue } {
  const res = result as Record<string, unknown> | null | undefined;

  if (operation === 'create' || operation === 'upsert') {
    if (res && typeof res === 'object' && typeof res.id === 'string') {
      return { entityId: res.id };
    }
    if (model === 'OrganizationCatalogCategory') {
      const a = args as {
        data?: { organizationId?: string; categoryId?: string };
      };
      const d = a?.data;
      if (d?.organizationId && d?.categoryId) {
        return {
          entityId: `${d.organizationId}:${d.categoryId}`,
        };
      }
    }
    if (model === 'OrganizationCatalogProduct') {
      const a = args as {
        data?: { organizationId?: string; productId?: string };
      };
      const d = a?.data;
      if (d?.organizationId && d?.productId) {
        return {
          entityId: `${d.organizationId}:${d.productId}`,
        };
      }
    }
    return {
      details: safeDetails({ operation, model, note: 'create sans id simple' }),
    };
  }

  if (operation === 'createMany') {
    const count = (result as { count?: number } | undefined)?.count;
    const payload = args as { data?: unknown };
    const data = payload?.data;
    return {
      details: safeDetails({
        count,
        records:
          Array.isArray(data) && data.length > 10
            ? { length: data.length }
            : data,
      }),
    };
  }

  const a = args as { where?: Record<string, unknown> };
  const where = a?.where;
  if (where && typeof where.id === 'string') {
    return { entityId: where.id };
  }

  return {
    details: safeDetails({ operation, model, where }),
  };
}

export function extendPrismaWithAudit(base: PrismaClient) {
  return base.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const result = await query(args);

          if (!MUTATION_OPS.has(operation)) {
            return result;
          }

          const action = operationToAction(operation);
          if (!action || SKIP_MODELS.has(model)) {
            return result;
          }

          const ctx = getAuditRequestContext();
          const { entityId, details } = pickEntityIdAndDetails(
            model,
            operation,
            args,
            result,
          );

          base.auditLog
            .create({
              data: {
                action,
                entityType: model,
                entityId: entityId ?? undefined,
                details: details ?? undefined,
                userId: ctx?.userId ?? undefined,
                organizationId: ctx?.organizationId ?? undefined,
                ipAddress: ctx?.ipAddress ?? undefined,
                userAgent: ctx?.userAgent ?? undefined,
              },
            })
            .catch((err: unknown) => {
              log.warn(
                `Échec écriture audit (${model}.${operation})`,
                err instanceof Error ? err.stack : err,
              );
            });

          return result;
        },
      },
    },
  });
}
