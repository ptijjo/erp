import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { OrganizationType } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MAISON_MERE_POLES } from '../seeder/maison-mere-poles';
import { MessageThreadScope } from '../generated/prisma/client';

const CROSS_POLE_MESSENGER_ROLES = new Set<string>([
  'ADMIN',
  'DIRECTOR_GENERAL',
  'DIRECTOR_OPERATIONS',
  ...MAISON_MERE_POLES.map((p) => p.directorRoleName),
]);

/** ADMIN, DG, et tout rôle `DIRECTOR_*` (seed ou créé ensuite). */
export function isCrossPoleMessengerRole(roleName: string): boolean {
  const name = roleName.trim();
  if (!name) return false;
  const upper = name.toUpperCase();
  if (CROSS_POLE_MESSENGER_ROLES.has(upper)) return true;
  if (CROSS_POLE_MESSENGER_ROLES.has(name)) return true;
  return upper.startsWith('DIRECTOR_');
}

export type MessagingPeer = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  organizationId: string;
  organizationType: OrganizationType;
  roleName: string;
  poleCode: string | null;
};

@Injectable()
export class MessagingPolicyService {
  constructor(private readonly prisma: PrismaService) {}

  canSendCrossPole(viewer: AuthenticatedUser): boolean {
    return isCrossPoleMessengerRole(viewer.role.name);
  }

  async loadPeer(userId: string): Promise<MessagingPeer> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        organizationId: true,
        organization: { select: { organizationType: true } },
        role: {
          select: {
            name: true,
            pole: { select: { code: true } },
          },
        },
      },
    });
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable.');
    }
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      organizationId: user.organizationId,
      organizationType: user.organization.organizationType,
      roleName: user.role.name,
      poleCode: user.role.pole?.code ?? null,
    };
  }

  assertCanExchange(
    viewer: AuthenticatedUser,
    peer: MessagingPeer,
  ): MessageThreadScope {
    if (viewer.sub === peer.id) {
      throw new ForbiddenException(
        'Vous ne pouvez pas vous envoyer de message à vous-même.',
      );
    }

    const viewerMain = viewer.organizationType === 'MAIN';
    const peerMain = peer.organizationType === OrganizationType.MAIN;

    if (!viewerMain && !peerMain) {
      return MessageThreadScope.SUBSIDIARY_TO_SUBSIDIARY;
    }

    if (viewerMain !== peerMain) {
      return MessageThreadScope.SUBSIDIARY_TO_MAIN;
    }

    const vPole = viewer.role.poleCode;
    const tPole = peer.poleCode;

    if (vPole && tPole && vPole === tPole) {
      return MessageThreadScope.MAIN_INTRA_POLE;
    }

    // Inter-pôles : OK si l’émetteur OU le destinataire est directeur / ADMIN / DG / OPS
    // (sinon un collaborateur ne peut pas écrire au directeur finance d’un autre pôle).
    if (
      this.canSendCrossPole(viewer) ||
      isCrossPoleMessengerRole(peer.roleName)
    ) {
      return MessageThreadScope.MAIN_CROSS_POLE;
    }

    throw new ForbiddenException(
      'Messagerie inter-pôles réservée aux directeurs de pôle, au directeur général et au directeur des opérations.',
    );
  }
}
