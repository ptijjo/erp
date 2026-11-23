import {
  getRlsRequestStore,
  rlsRequestContext,
  type RlsRequestStore,
} from './rls-request-context';

/**
 * `true` = SET LOCAL : le réglage meurt à la fin de la transaction
 * et ne peut pas ressortir sur une autre requête du pool.
 */
export const RLS_SET_CONFIG_SQL = `SELECT set_config('app.organization_id', $1, true), set_config('app.user_id', $2, true), set_config('app.is_main', $3, true), set_config('app.rls_bypass', $4, true)`;

/** Une requête métier isolée peut être longue ; le défaut Prisma (5 s) est trop court. */
export const RLS_QUERY_TX_OPTIONS = {
  maxWait: 10_000,
  timeout: 60_000,
} as const;

export type RlsTx = {
  $executeRawUnsafe: (query: string, ...values: unknown[]) => Promise<unknown>;
} & Record<
  string,
  Record<string, (args: unknown) => Promise<unknown>> | undefined
>;

export type RlsQueryParams = {
  model: string;
  operation: string;
  args: unknown;
  query: (args: unknown) => Promise<unknown>;
};

export type RlsTransactionRunner = (
  fn: (tx: RlsTx) => Promise<unknown>,
  options?: { maxWait: number; timeout: number },
) => Promise<unknown>;

export function rlsSessionParams(
  store: RlsRequestStore,
): [string, string, string, string] {
  return [
    store.organizationId ?? '',
    store.userId ?? '',
    store.isMain ? 'true' : 'false',
    store.bypass ? 'on' : '',
  ];
}

export function prismaDelegateKey(model: string): string {
  return model.charAt(0).toLowerCase() + model.slice(1);
}

export async function applyRlsOnTx(
  tx: RlsTx,
  store: RlsRequestStore,
): Promise<void> {
  await tx.$executeRawUnsafe(RLS_SET_CONFIG_SQL, ...rlsSessionParams(store));
}

/**
 * Exécute une opération de modèle dans une transaction courte qui pose
 * le contexte RLS sur la même connexion que la requête.
 */
export async function runModelWithRls(
  params: RlsQueryParams,
  transaction: RlsTransactionRunner,
): Promise<unknown> {
  const store = getRlsRequestStore();
  if (!store || store.routing) {
    return params.query(params.args);
  }

  return transaction(async (tx) => {
    await applyRlsOnTx(tx, store);
    const delegate = tx[prismaDelegateKey(params.model)];
    const op = delegate?.[params.operation];
    if (typeof op !== 'function') {
      throw new Error(
        `Delegate Prisma manquant: ${params.model}.${params.operation}`,
      );
    }
    return op(params.args);
  }, RLS_QUERY_TX_OPTIONS);
}

/**
 * Branche `$transaction` pour que le `set_config` local partage
 * la connexion des écritures groupées.
 */
export function wrapRlsTransaction<
  T extends (arg: unknown, options?: unknown) => unknown,
>(
  original: T,
  executeRawUnsafe: (sql: string, ...values: unknown[]) => Promise<unknown>,
): T {
  const wrapped = (arg: unknown, options?: unknown): unknown => {
    const store = getRlsRequestStore();
    if (!store || store.routing) {
      return original(arg, options);
    }

    if (typeof arg === 'function') {
      return original(async (tx: RlsTx) => {
        await applyRlsOnTx(tx, store);
        return rlsRequestContext.run({ ...store, routing: true }, () =>
          (arg as (tx: RlsTx) => Promise<unknown>)(tx),
        );
      }, options);
    }

    if (Array.isArray(arg)) {
      const marker = executeRawUnsafe(
        RLS_SET_CONFIG_SQL,
        ...rlsSessionParams(store),
      );
      const batch: unknown[] = [marker];
      for (const query of arg) {
        batch.push(query);
      }
      return rlsRequestContext.run({ ...store, routing: true }, () =>
        original(batch, options),
      );
    }

    return original(arg, options);
  };

  return wrapped as T;
}
