/** Rôle embarqué dans le JWT (sous-ensemble stable pour le front /auth/me). */
export type JwtRoleClaims = {
  id: string;
  name: string;
  description: string | null;
};

/** Contenu signé dans le JWT après login (`firstLogin` absent sur les anciens jetons). */
export type AccessTokenPayload = {
  email: string;
  sub: string;
  organisationId: string;
  firstLogin?: boolean;
  role: JwtRoleClaims;
};

/** Utilisateur issu de la validation JWT (`req.user`). */
export type AuthenticatedUser = {
  email: string;
  sub: string;
  organisationId: string;
  firstLogin: boolean;
  role: JwtRoleClaims;
};

/** Réponse de GET /auth/me (JWT + nom d’organisation résolu en base). */
export type MeResponse = AuthenticatedUser & {
  organisationName: string;
};
