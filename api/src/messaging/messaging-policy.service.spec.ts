import { ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { AuthenticatedUser } from '../auth/auth.types';
import { MessageThreadScope, OrganizationType } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MessagingPolicyService } from './messaging-policy.service';

function viewer(
  partial: Partial<AuthenticatedUser> & Pick<AuthenticatedUser, 'sub'>,
): AuthenticatedUser {
  return {
    sub: partial.sub,
    email: partial.email ?? 'a@test.com',
    organisationId: partial.organisationId ?? 'org-main',
    organizationType: partial.organizationType ?? 'MAIN',
    role: partial.role ?? { id: 'r1', name: 'ADMIN', poleCode: null },
  };
}

function peer(partial: Partial<{
  id: string;
  organizationType: OrganizationType;
  roleName: string;
  poleCode: string | null;
}>) {
  return {
    id: partial.id ?? 'peer-1',
    email: 'b@test.com',
    firstName: null,
    lastName: null,
    organizationId: 'org-2',
    organizationType: partial.organizationType ?? OrganizationType.MAIN,
    roleName: partial.roleName ?? 'STAFF',
    poleCode: partial.poleCode ?? 'POLE_FINANCE',
  };
}

describe('MessagingPolicyService', () => {
  let service: MessagingPolicyService;

  beforeEach(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        MessagingPolicyService,
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();
    service = mod.get(MessagingPolicyService);
  });

  it('autorise DG vers un autre pôle', () => {
    const scope = service.assertCanExchange(
      viewer({
        sub: 'u1',
        role: { id: 'r', name: 'DIRECTOR_GENERAL', poleCode: null },
      }),
      peer({ poleCode: 'POLE_MARKETING', roleName: 'STAFF' }),
    );
    expect(scope).toBe(MessageThreadScope.MAIN_CROSS_POLE);
  });

  it('refuse inter-pôle pour un rôle sans délégation', () => {
    expect(() =>
      service.assertCanExchange(
        viewer({
          sub: 'u1',
          role: { id: 'r', name: 'STAFF', poleCode: 'POLE_FINANCE' },
        }),
        peer({ poleCode: 'POLE_MARKETING', roleName: 'STAFF' }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('autorise intra-pôle même pôle', () => {
    const scope = service.assertCanExchange(
      viewer({
        sub: 'u1',
        role: { id: 'r', name: 'STAFF', poleCode: 'POLE_FINANCE' },
      }),
      peer({ poleCode: 'POLE_FINANCE', roleName: 'STAFF' }),
    );
    expect(scope).toBe(MessageThreadScope.MAIN_INTRA_POLE);
  });

  it('autorise un collaborateur vers un DIRECTOR_* d’un autre pôle', () => {
    const scope = service.assertCanExchange(
      viewer({
        sub: 'u1',
        role: { id: 'r', name: 'ASSISTANT_HR', poleCode: 'Pole_HR' },
      }),
      peer({
        poleCode: 'Pole_FINANCE',
        roleName: 'DIRECTOR_FINANCE',
      }),
    );
    expect(scope).toBe(MessageThreadScope.MAIN_CROSS_POLE);
  });

  it('autorise un DIRECTOR_* vers un autre pôle (préfixe)', () => {
    const scope = service.assertCanExchange(
      viewer({
        sub: 'u1',
        role: { id: 'r', name: 'DIRECTOR_HR', poleCode: 'Pole_HR' },
      }),
      peer({
        poleCode: 'Pole_FINANCE',
        roleName: 'DIRECTOR_FINANCE',
      }),
    );
    expect(scope).toBe(MessageThreadScope.MAIN_CROSS_POLE);
  });

  it('autorise un rôle directeur custom préfixé DIRECTOR_', () => {
    expect(service.canSendCrossPole(
      viewer({
        sub: 'u1',
        role: { id: 'r', name: 'DIRECTOR_CUSTOM_POLE', poleCode: 'Pole_X' },
      }),
    )).toBe(true);
  });
});
