/** Contenu signé dans le JWT d’accès : uniquement l’identifiant utilisateur. */
export type AccessTokenPayload = {
  sub: string;
};

/** Rôle exposé après chargement utilisateur en base. */
export type JwtRoleClaims = {
  id: string;
  name: string;
  description: string | null;
  poleCode: string | null;
};

/** Utilisateur issu de la validation JWT (`req.user`). */
export type AuthenticatedUser = {
  email: string;
  sub: string;
  organisationId: string;
  organizationType: 'MAIN' | 'SUBSIDIARY';
  organizationSlug: string;
  firstLogin: boolean;
  role: JwtRoleClaims;
};

/** Réponse de GET /auth/me (profil rechargé depuis la base). */
export type MeResponse = AuthenticatedUser & {
  organisationName: string;
  permissionMode: 'FULL_ACCESS' | 'ROLE_PERMISSIONS' | 'FALLBACK_READ_ALL';
  permissions: string[];
  /** Fille : au moins une catégorie ou un produit dans le catalogue vente. */
  hasSalesCatalog: boolean;
};

export type SafeUserForSession = {
  id: string;
  email: string;
  firstLogin: boolean;
  organizationId: string;
  organization: {
    id: string;
    name: string;
    slug: string;
    organizationType: 'MAIN' | 'SUBSIDIARY';
  };
  role: {
    id: string;
    name: string;
    description: string | null;
    pole: { code: string } | null;
  };
};

export function toAuthenticatedUser(user: SafeUserForSession): AuthenticatedUser {
  return {
    email: user.email,
    sub: user.id,
    organisationId: user.organizationId,
    organizationType: user.organization.organizationType,
    organizationSlug: user.organization.slug,
    firstLogin: user.firstLogin,
    role: {
      id: user.role.id,
      name: user.role.name,
      description: user.role.description,
      poleCode: user.role.pole?.code ?? null,
    },
  };
}
