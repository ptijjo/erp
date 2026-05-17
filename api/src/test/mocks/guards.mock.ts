/** Garde Nest factice qui autorise toutes les requêtes en test unitaire. */
export const allowAllGuard = { canActivate: (): boolean => true };
