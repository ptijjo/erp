import type { AuthPrismaMock } from './auth-prisma.mock';

/** Valeurs sûres pour les modèles Prisma souvent appelés sans mock explicite en e2e. */
export function applyE2ePrismaDefaults(prisma: AuthPrismaMock): AuthPrismaMock {
  prisma.organizationCatalogCategory ??= {};
  prisma.organizationCatalogCategory.count ??= jest
    .fn()
    .mockResolvedValue(1);

  prisma.organizationCatalogProduct ??= {};
  prisma.organizationCatalogProduct.count ??= jest
    .fn()
    .mockResolvedValue(0);

  prisma.accountingPeriodClosure ??= {};
  prisma.accountingPeriodClosure.findFirst ??= jest
    .fn()
    .mockResolvedValue(null);

  prisma.vente ??= {};
  prisma.vente.findMany ??= jest.fn().mockResolvedValue([]);
  prisma.vente.groupBy ??= jest.fn().mockResolvedValue([]);

  prisma.venteLine ??= {};
  prisma.venteLine.findMany ??= jest.fn().mockResolvedValue([]);

  return prisma;
}
