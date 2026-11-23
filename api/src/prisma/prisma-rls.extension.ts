import { runModelWithRls, wrapRlsTransaction } from './rls-session';

type RlsCapableClient = {
  $extends: (extension: unknown) => RlsCapableClient;
  $transaction: (arg: unknown, options?: unknown) => Promise<unknown>;
  $executeRawUnsafe: (query: string, ...values: unknown[]) => Promise<unknown>;
};

/**
 * Les requêtes d’une requête HTTP (ou d’un seed / cron) portent le contexte RLS
 * sur la connexion qui exécute le SQL, via `set_config(..., true)`.
 */
export function bindPrismaRls<T>(client: T): T {
  const raw = client as RlsCapableClient;
  const originalTransaction = (
    arg: unknown,
    options?: unknown,
  ): Promise<unknown> => raw.$transaction(arg, options);

  const extended = raw.$extends({
    query: {
      $allModels: {
        $allOperations: (params: {
          model: string;
          operation: string;
          args: unknown;
          query: (args: unknown) => Promise<unknown>;
        }) =>
          runModelWithRls(
            {
              model: params.model,
              operation: params.operation,
              args: params.args,
              query: params.query,
            },
            (fn, options) => originalTransaction(fn, options),
          ),
      },
    },
  });

  const runTransaction = (arg: unknown, options?: unknown): Promise<unknown> =>
    extended.$transaction(arg, options);
  const executeRaw = (sql: string, ...values: unknown[]): Promise<unknown> =>
    extended.$executeRawUnsafe(sql, ...values);

  Object.defineProperty(extended, '$transaction', {
    value: wrapRlsTransaction(runTransaction, executeRaw),
    configurable: true,
    writable: true,
  });

  return extended as T;
}
