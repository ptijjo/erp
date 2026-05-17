import type { Organization, Pole, Role } from '../generated/prisma/client';

export type RoleWithPole = Role & {
  pole?: Pick<Pole, 'code'> | null;
};

/** User tel que renvoyé par Prisma avec `include: { role: true }`. */
export type UserWithRole = {
  id: string;
  email: string;
  password: string;
  firstName: string | null;
  lastName: string | null;
  firstLogin: boolean;
  createdAt: Date;
  updatedAt: Date;
  organizationId: string;
  roleId: string;
  role: RoleWithPole;
};

export type SafeUserWithRole = Omit<UserWithRole, 'password'>;

export type UserOrganizationClaims = Pick<
  Organization,
  'id' | 'name' | 'slug' | 'organizationType'
>;

/** Pour login JWT : user + organisation (type maison mère / filiale). */
export type UserWithRoleAndOrg = UserWithRole & {
  organization: UserOrganizationClaims;
};

export type SafeUserWithRoleAndOrg = Omit<UserWithRoleAndOrg, 'password'>;

export type SafeUserPublic = SafeUserWithRole & {
  organization: Organization;
};

/** Détail fiche utilisateur : métadonnées de création depuis `AuditLog` si disponible. */
export type SafeUserDetail = SafeUserPublic & {
  createdBy: { id: string; email: string } | null;
};
