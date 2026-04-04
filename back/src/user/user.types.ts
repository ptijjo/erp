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

export type SafeUserPublic = SafeUserWithRole & {
  organization: Organization;
};
