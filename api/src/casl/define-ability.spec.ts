import type { AuthenticatedUser } from '../auth/auth.types';
import {
  buildAbilityFromPermissionNames,
  defineAbilityFor,
  parsePermissionName,
} from './define-ability';

function user(
  roleName: string,
  organizationType: 'MAIN' | 'SUBSIDIARY' = 'MAIN',
): AuthenticatedUser {
  return {
    sub: 'u1',
    email: 'a@vifaa.local',
    organisationId: 'org-1',
    organizationType,
    organizationSlug: 'vifaa',
    firstLogin: false,
    role: {
      id: 'role-1',
      name: roleName,
      description: null,
      poleCode: roleName.startsWith('DIRECTOR_') ? 'Pole_FINANCE' : null,
    },
  };
}

describe('define-ability', () => {
  it('parsePermissionName accepte action:Subject', () => {
    expect(parsePermissionName('read:Product')).toEqual({
      action: 'read',
      subject: 'Product',
    });
    expect(parsePermissionName('bad')).toBeNull();
  });

  it('FULL_ACCESS peut tout manage', () => {
    const ability = defineAbilityFor(user('ADMIN'));
    expect(ability.can('manage', 'all')).toBe(true);
    expect(ability.can('read', 'Product')).toBe(true);
  });

  it('deny-by-default sans permissions', () => {
    const ability = defineAbilityFor(user('DIRECTOR_FINANCE'));
    expect(ability.can('read', 'Product')).toBe(false);
    expect(ability.can('manage', 'all')).toBe(false);
  });

  it('buildAbilityFromPermissionNames n’ajoute plus read all pour MAIN', () => {
    const ability = buildAbilityFromPermissionNames(user('STAFF_FINANCE'), [
      'read:Budget',
    ]);
    expect(ability.can('read', 'Budget')).toBe(true);
    expect(ability.can('read', 'Product')).toBe(false);
  });

  it('read:all accorde la lecture sauf AuditLog', () => {
    const ability = buildAbilityFromPermissionNames(user('DIRECTOR_FINANCE'), [
      'read:all',
    ]);
    expect(ability.can('read', 'Product')).toBe(true);
    expect(ability.can('read', 'Budget')).toBe(true);
    expect(ability.can('read', 'AuditLog')).toBe(false);
  });

  it('liste vide = deny', () => {
    const ability = buildAbilityFromPermissionNames(user('MANAGER', 'SUBSIDIARY'), []);
    expect(ability.can('read', 'Stock')).toBe(false);
  });
});
