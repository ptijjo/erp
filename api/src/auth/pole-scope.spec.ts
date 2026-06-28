import { ForbiddenException } from '@nestjs/common';
import type { AuthenticatedUser } from './auth.types';
import {
  assertMainOrgPoleDomain,
  bypassesMainOrgPoleScope,
  mainOrgUserListPoleFilter,
} from './pole-scope';

function mainViewer(
  partial: Partial<AuthenticatedUser> & {
    role: AuthenticatedUser['role'];
  },
): AuthenticatedUser {
  return {
    sub: 'u1',
    email: 'a@vifaa.local',
    organisationId: 'org-main',
    organizationType: 'MAIN',
    organizationSlug: 'vifaa',
    firstLogin: false,
    ...partial,
  };
}

describe('pole-scope', () => {
  it('bypassesMainOrgPoleScope pour ADMIN et directeurs', () => {
    expect(
      bypassesMainOrgPoleScope(
        mainViewer({ role: { id: 'r', name: 'ADMIN', description: null, poleCode: null } }),
      ),
    ).toBe(true);
    expect(
      bypassesMainOrgPoleScope(
        mainViewer({
          role: {
            id: 'r',
            name: 'DIRECTOR_FINANCE',
            description: null,
            poleCode: 'Pole_FINANCE',
          },
        }),
      ),
    ).toBe(true);
  });

  it('bypassesMainOrgPoleScope pour les filiales (périmètre org)', () => {
    expect(
      bypassesMainOrgPoleScope({
        sub: 'u-sub',
        email: 'f@filiale.local',
        organisationId: 'org-sub',
        organizationType: 'SUBSIDIARY',
        organizationSlug: 'filiale',
        firstLogin: false,
        role: { id: 'r', name: 'MANAGER', description: null, poleCode: null },
      }),
    ).toBe(true);
  });

  it('refuse un pôle maison mère hors domaine', () => {
    const viewer = mainViewer({
      role: {
        id: 'r',
        name: 'STAFF_FINANCE',
        description: null,
        poleCode: 'Pole_FINANCE',
      },
    });
    expect(() => assertMainOrgPoleDomain(viewer, 'Pole_HR')).toThrow(
      ForbiddenException,
    );
    expect(() =>
      assertMainOrgPoleDomain(viewer, 'Pole_FINANCE'),
    ).not.toThrow();
  });

  it('mainOrgUserListPoleFilter restreint au pôle du viewer', () => {
    const filter = mainOrgUserListPoleFilter(
      mainViewer({
        role: {
          id: 'r',
          name: 'STAFF_HR',
          description: null,
          poleCode: 'Pole_HR',
        },
      }),
    );
    expect(filter).toEqual({
      organizationId: 'org-main',
      role: { pole: { code: 'Pole_HR' } },
    });
  });
});
