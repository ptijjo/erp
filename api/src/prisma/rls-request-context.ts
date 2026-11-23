import { AsyncLocalStorage } from 'node:async_hooks';

export type RlsRequestStore = {
  organizationId: string | null;
  userId: string | null;
  isMain: boolean;
  /** Seeder / cron / tests hors HTTP. */
  bypass: boolean;
  /**
   * Vrai pendant l’exécution d’une transaction qui a déjà posé `set_config`.
   * Les requêtes suivantes restent sur cette connexion au lieu d’en ouvrir une autre.
   */
  routing?: boolean;
};

export const rlsRequestContext = new AsyncLocalStorage<RlsRequestStore>();

export function getRlsRequestStore(): RlsRequestStore | undefined {
  return rlsRequestContext.getStore();
}
