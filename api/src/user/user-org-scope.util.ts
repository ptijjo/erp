import { NotFoundException } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { assertOrganizationResourceAccess } from '../auth/organization-scope';
import { PrismaService } from '../prisma/prisma.service';

export async function assertTargetUserInViewerScope(
  prisma: PrismaService,
  userId: string,
  viewer: AuthenticatedUser,
): Promise<void> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { organizationId: true },
  });
  if (!u) {
    throw new NotFoundException('Utilisateur introuvable');
  }
  assertOrganizationResourceAccess(viewer, u.organizationId);
}
