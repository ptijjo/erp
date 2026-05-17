import { PrismaService } from '../../prisma/prisma.service';

/** Client Prisma factice pour les tests unitaires (pas de connexion réelle). */
export function createMockPrismaService(): Record<string, unknown> {
  return {
    $transaction: jest.fn(),
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  };
}

export function mockPrismaServiceProvider(
  overrides: Record<string, unknown> = {},
) {
  return {
    provide: PrismaService,
    useValue: { ...createMockPrismaService(), ...overrides },
  };
}
