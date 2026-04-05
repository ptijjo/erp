import { NotFoundException } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { assertOrganizationResourceAccess } from '../auth/organization-scope';
import { PrismaService } from '../prisma/prisma.service';

export async function assertBulletinInViewerScope(
  prisma: PrismaService,
  bulletinId: string,
  viewer: AuthenticatedUser,
): Promise<void> {
  const b = await prisma.bulletinPaie.findUnique({
    where: { id: bulletinId },
    select: { organizationId: true },
  });
  if (!b) {
    throw new NotFoundException('Bulletin de paie introuvable');
  }
  assertOrganizationResourceAccess(viewer, b.organizationId);
}
