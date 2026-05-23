import * as bcrypt from 'bcrypt';
import type { UserWithRoleAndOrg } from '../../src/user/user.types';

export const E2E_TEST_PASSWORD = 'TestPass1!';

export const E2E_TEST_EMAIL = 'e2e-auth@test.local';

export const E2E_SUBSIDIARY_EMAIL = 'e2e-filiale@test.local';

export const E2E_SUBSIDIARY_ORG_ID = 'e2e-org-subsidiary-id';

export const E2E_SUBSIDIARY_ROLE_ID = 'e2e-role-subsidiary-manager';

export const E2E_HR_DIRECTOR_EMAIL = 'e2e-drh@test.local';

export const E2E_HR_DIRECTOR_ROLE_ID = 'e2e-role-director-hr';

export async function hashE2ePassword(): Promise<string> {
  return bcrypt.hash(E2E_TEST_PASSWORD, 4);
}

export function buildE2eUserRow(passwordHash: string): UserWithRoleAndOrg {
  return {
    id: 'e2e-user-id',
    email: E2E_TEST_EMAIL,
    password: passwordHash,
    firstName: 'E2E',
    lastName: 'Admin',
    firstLogin: false,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    organizationId: 'e2e-org-id',
    roleId: 'e2e-role-admin',
    role: {
      id: 'e2e-role-admin',
      name: 'ADMIN',
      description: 'Administrateur',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedAt: null,
      organizationScopeId: null,
      poleId: null,
      pole: null,
    },
    organization: {
      id: 'e2e-org-id',
      name: 'VIFAA Test',
      slug: 'vifaa-test',
      organizationType: 'MAIN',
    },
  };
}

export function buildE2eHrDirectorUserRow(
  passwordHash: string,
): UserWithRoleAndOrg {
  return {
    id: 'e2e-hr-user-id',
    email: E2E_HR_DIRECTOR_EMAIL,
    password: passwordHash,
    firstName: 'Directeur',
    lastName: 'RH',
    firstLogin: false,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    organizationId: 'e2e-org-id',
    roleId: E2E_HR_DIRECTOR_ROLE_ID,
    role: {
      id: E2E_HR_DIRECTOR_ROLE_ID,
      name: 'DIRECTOR_HR',
      description: 'Directeur RH e2e',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedAt: null,
      organizationScopeId: 'e2e-org-id',
      poleId: 'e2e-pole-hr-id',
      pole: { code: 'Pole_HR' },
    },
    organization: {
      id: 'e2e-org-id',
      name: 'VIFAA Test',
      slug: 'vifaa-test',
      organizationType: 'MAIN',
    },
  };
}

export function buildE2eSubsidiaryUserRow(
  passwordHash: string,
): UserWithRoleAndOrg {
  return {
    id: 'e2e-subsidiary-user-id',
    email: E2E_SUBSIDIARY_EMAIL,
    password: passwordHash,
    firstName: 'Manager',
    lastName: 'Filiale',
    firstLogin: false,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    organizationId: E2E_SUBSIDIARY_ORG_ID,
    roleId: E2E_SUBSIDIARY_ROLE_ID,
    role: {
      id: E2E_SUBSIDIARY_ROLE_ID,
      name: 'MANAGER_FILIALE',
      description: 'Manager filiale e2e',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedAt: null,
      organizationScopeId: E2E_SUBSIDIARY_ORG_ID,
      poleId: null,
      pole: null,
    },
    organization: {
      id: E2E_SUBSIDIARY_ORG_ID,
      name: 'Filiale E2E',
      slug: 'filiale-e2e',
      organizationType: 'SUBSIDIARY',
    },
  };
}
