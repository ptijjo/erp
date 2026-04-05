import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { isMainOrganizationUser } from '../auth/organization-scope';
import type { PrismaService } from '../prisma/prisma.service';
import type { Prisma } from '../generated/prisma/client';

/** Toutes les catégories sous les racines (racines incluses). */
export async function expandCategoryIdsWithDescendants(
  prisma: PrismaService,
  rootIds: string[],
): Promise<Set<string>> {
  if (rootIds.length === 0) {
    return new Set();
  }
  const all = await prisma.category.findMany({
    select: { id: true, parentId: true },
  });
  const byParent = new Map<string | null, string[]>();
  for (const c of all) {
    const p = c.parentId ?? null;
    if (!byParent.has(p)) {
      byParent.set(p, []);
    }
    byParent.get(p)!.push(c.id);
  }
  const out = new Set<string>();
  const q = [...rootIds];
  while (q.length > 0) {
    const id = q.shift()!;
    if (out.has(id)) {
      continue;
    }
    out.add(id);
    for (const child of byParent.get(id) ?? []) {
      q.push(child);
    }
  }
  return out;
}

/**
 * Produits visibles pour une filiale : si aucune affectation catalogue,
 * tous les `offeredToSubsidiaries` ; sinon union (produits des catégories
 * affectées + sous-arbres) ∪ (produits affectés explicitement), toujours
 * avec `offeredToSubsidiaries`.
 */
export async function productCatalogWhereForSubsidiary(
  prisma: PrismaService,
  organizationId: string,
): Promise<Prisma.ProductWhereInput> {
  const pool: Prisma.ProductWhereInput = { offeredToSubsidiaries: true };

  const [catLinks, prodLinks] = await Promise.all([
    prisma.organizationCatalogCategory.findMany({
      where: { organizationId },
      select: { categoryId: true },
    }),
    prisma.organizationCatalogProduct.findMany({
      where: { organizationId },
      select: { productId: true },
    }),
  ]);

  if (catLinks.length === 0 && prodLinks.length === 0) {
    return pool;
  }

  const or: Prisma.ProductWhereInput[] = [];

  if (catLinks.length > 0) {
    const expanded = await expandCategoryIdsWithDescendants(
      prisma,
      catLinks.map((c) => c.categoryId),
    );
    if (expanded.size > 0) {
      or.push({
        ...pool,
        categoryId: { in: [...expanded] },
      });
    }
  }

  const extraIds = prodLinks.map((p) => p.productId);
  if (extraIds.length > 0) {
    or.push({
      ...pool,
      id: { in: extraIds },
    });
  }

  if (or.length === 0) {
    return { id: { in: [] } };
  }
  return { OR: or };
}

export async function productCatalogWhereForViewer(
  prisma: PrismaService,
  viewer: AuthenticatedUser,
): Promise<Prisma.ProductWhereInput> {
  if (isMainOrganizationUser(viewer)) {
    return {};
  }
  return productCatalogWhereForSubsidiary(prisma, viewer.organisationId);
}

/** IDs de catégories visibles pour une filiale (produits du catalogue + ancêtres). */
export async function subsidiaryVisibleCategoryIdsForOrganization(
  prisma: PrismaService,
  organizationId: string,
): Promise<Set<string>> {
  const where = await productCatalogWhereForSubsidiary(prisma, organizationId);
  const products = await prisma.product.findMany({
    where,
    select: { categoryId: true },
  });
  const seedIds = [...new Set(products.map((p) => p.categoryId))];
  if (seedIds.length === 0) {
    return new Set();
  }
  const allCats = await prisma.category.findMany({
    select: { id: true, parentId: true },
  });
  const byId = new Map(allCats.map((c) => [c.id, c]));
  const keep = new Set<string>();
  for (const startId of seedIds) {
    let cur: string | null | undefined = startId;
    while (cur) {
      if (keep.has(cur)) {
        break;
      }
      keep.add(cur);
      cur = byId.get(cur)?.parentId ?? null;
    }
  }
  return keep;
}

export async function assertProductUsableForOrganization(
  prisma: PrismaService,
  productId: string,
  organizationId: string,
): Promise<void> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { organizationType: true },
  });
  if (!org) {
    throw new NotFoundException('Organisation introuvable');
  }
  if (org.organizationType === 'MAIN') {
    return;
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { offeredToSubsidiaries: true },
  });
  if (!product) {
    throw new NotFoundException('Produit introuvable');
  }
  if (!product.offeredToSubsidiaries) {
    throw new ForbiddenException(
      'Ce produit n’est pas proposé aux filiales par la maison mère.',
    );
  }

  const catalogWhere = await productCatalogWhereForSubsidiary(
    prisma,
    organizationId,
  );
  const ok = await prisma.product.count({
    where: { AND: [{ id: productId }, catalogWhere] },
  });
  if (ok === 0) {
    throw new ForbiddenException(
      'Ce produit n’est pas affecté au catalogue de votre filiale.',
    );
  }
}
