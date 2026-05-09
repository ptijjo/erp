-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdByOrganizationId" TEXT,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Supplier_createdByOrganizationId_idx" ON "Supplier"("createdByOrganizationId");

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_createdByOrganizationId_fkey" FOREIGN KEY ("createdByOrganizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN "supplierId" TEXT;

-- CreateIndex
CREATE INDEX "Product_supplierId_idx" ON "Product"("supplierId");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "StockOrder" ADD COLUMN "supplierId" TEXT;

-- Fournisseur par défaut pour les commandes existantes (avant affectation produit → fournisseur)
INSERT INTO "Supplier" ("id", "name", "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, 'Fournisseur (à configurer)', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

UPDATE "StockOrder" SET "supplierId" = (SELECT "id" FROM "Supplier" LIMIT 1) WHERE "supplierId" IS NULL;

UPDATE "StockOrder" AS o
SET "supplierId" = p."supplierId"
FROM "Product" AS p
WHERE p."id" = o."productId" AND p."supplierId" IS NOT NULL;

ALTER TABLE "StockOrder" ALTER COLUMN "supplierId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "StockOrder" ADD CONSTRAINT "StockOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "StockOrder_supplierId_idx" ON "StockOrder"("supplierId");
