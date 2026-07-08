import { BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';

/** Résout le compte utilisateur à lier (id explicite ou correspondance email / org). */
export async function resolveUserIdForEmployeeLink(
  prisma: PrismaService,
  params: {
    userId?: string | null;
    email?: string | null;
    organizationId: string;
    employeeId?: string;
  },
): Promise<string | null> {
  const explicitUserId = params.userId?.trim();
  if (explicitUserId) {
    await assertUserLinkable(
      prisma,
      explicitUserId,
      params.organizationId,
      params.employeeId,
    );
    return explicitUserId;
  }

  const email = params.email?.trim().toLowerCase();
  if (!email) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, organizationId: true, deletedAt: true },
  });
  if (!user || user.deletedAt) {
    return null;
  }
  if (user.organizationId !== params.organizationId) {
    throw new BadRequestException(
      'L’email correspond à un utilisateur d’une autre organisation.',
    );
  }

  await assertUserLinkable(
    prisma,
    user.id,
    params.organizationId,
    params.employeeId,
  );
  return user.id;
}

async function assertUserLinkable(
  prisma: PrismaService,
  userId: string,
  organizationId: string,
  employeeId: string | undefined,
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, organizationId: true, deletedAt: true },
  });
  if (!user || user.deletedAt) {
    throw new BadRequestException('Utilisateur introuvable.');
  }
  if (user.organizationId !== organizationId) {
    throw new BadRequestException(
      'L’utilisateur doit appartenir à la même organisation que l’employé.',
    );
  }
  const linked = await prisma.employee.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (linked && linked.id !== employeeId) {
    throw new BadRequestException(
      'Cet utilisateur est déjà rattaché à un autre employé.',
    );
  }
}

/** Aligne le profil utilisateur sur la fiche RH (source de vérité identité). */
export async function syncUserProfileFromEmployee(
  prisma: PrismaService,
  userId: string,
  firstName: string,
  lastName: string,
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
    },
  });
}
