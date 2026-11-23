import {
  getRlsRequestStore,
  rlsRequestContext,
  type RlsRequestStore,
} from './rls-request-context';

const BYPASS_STORE: RlsRequestStore = {
  organizationId: null,
  userId: null,
  isMain: false,
  bypass: true,
};

/**
 * Exécute `fn` avec `app.rls_bypass=on` posé sur la connexion de chaque requête
 * (transaction locale), pas sur une session du pool.
 */
export async function withRlsBypass<T>(fn: () => Promise<T>): Promise<T> {
  const parent = getRlsRequestStore();
  const store: RlsRequestStore = parent
    ? { ...parent, bypass: true, routing: false }
    : BYPASS_STORE;
  return rlsRequestContext.run(store, fn);
}
