import type { Organization, Role } from '../generated/prisma/client';

/** User tel que renvoyé par Prisma avec `include: { role: true }`. */
export type UserWithRole = {
  id: string;
  email: string;
  password: string;
  firstLogin: boolean;
  createdAt: Date;
  updatedAt: Date;
  organizationId: string;
  roleId: string;
  role: Role;
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
