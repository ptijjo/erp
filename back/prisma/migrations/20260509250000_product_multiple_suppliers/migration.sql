-- Alignement schéma : prix fournisseur (si colonne absente en base)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Supplier' AND column_name = 'price'
  ) THEN
    ALTER TABLE "Supplier" ADD COLUMN "price" DECIMAL(65,30) NOT NULL DEFAULT 0;
  END IF;
END $$;

DROP TABLE IF EXISTS "ProductSupplier";

CREATE TABLE "ProductSupplier" (
    "productId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductSupplier_pkey" PRIMARY KEY ("productId","supplierId")
);

CREATE INDEX "ProductSupplier_supplierId_idx" ON "ProductSupplier"("supplierId");

ALTER TABLE "ProductSupplier" ADD CONSTRAINT "ProductSupplier_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductSupplier" ADD CONSTRAINT "ProductSupplier_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Product' AND column_name = 'supplierId'
  ) THEN
    INSERT INTO "ProductSupplier" ("productId", "supplierId", "createdAt")
    SELECT "id", "supplierId", CURRENT_TIMESTAMP
    FROM "Product"
    WHERE "supplierId" IS NOT NULL;
  END IF;
END $$;

ALTER TABLE "Product" DROP CONSTRAINT IF EXISTS "Product_supplierId_fkey";

DROP INDEX IF EXISTS "Product_supplierId_idx";

ALTER TABLE "Product" DROP COLUMN IF EXISTS "supplierId";
